import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/payments/moyasar", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/payments/moyasar")
  >();

  return {
    ...original,
    fetchMoyasarPayment: vi.fn(),
  };
});
vi.mock("@/lib/payments/receipt", () => ({
  attemptPaymentReceipt: vi.fn(),
}));

import {
  confirmMoyasarPayment,
  PaymentConfirmationError,
} from "@/lib/payments/confirmation";
import {
  fetchMoyasarPayment,
  MoyasarApiError,
} from "@/lib/payments/moyasar";
import { attemptPaymentReceipt } from "@/lib/payments/receipt";
import { createAdminClient } from "@/lib/supabase/admin";

const paymentId = "90000000-0000-4000-8000-000000000001";
const orderId = "70000000-0000-4000-8000-000000000001";
const userId = "10000000-0000-4000-8000-000000000001";
const enrollmentId = "80000000-0000-4000-8000-000000000001";

function verifiedPayment(status = "paid") {
  return {
    payment: {
      id: paymentId,
      status,
      amount: 35000,
      currency: "SAR",
      metadata: { order_id: orderId },
      source: { message: status === "failed" ? "Card declined" : null },
    },
    rawPayload: {
      id: paymentId,
      status,
      amount: 35000,
      currency: "SAR",
      metadata: { order_id: orderId },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchMoyasarPayment).mockResolvedValue(
    verifiedPayment() as Awaited<ReturnType<typeof fetchMoyasarPayment>>,
  );
  vi.mocked(attemptPaymentReceipt).mockResolvedValue({ status: "sent" });
});

describe("payment confirmation", () => {
  it("sends only server-verified payment values to the atomic database function", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          order_status: "paid",
          enrollment_id: enrollmentId,
          state_changed: true,
        },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);

    await expect(
      confirmMoyasarPayment(paymentId, {
        kind: "webhook",
        eventId: "91000000-0000-4000-8000-000000000001",
        eventType: "payment_paid",
      }),
    ).resolves.toEqual({
      orderId,
      orderStatus: "paid",
      enrollmentId,
      stateChanged: true,
    });

    expect(rpc).toHaveBeenCalledWith("process_verified_moyasar_payment", {
      target_order: orderId,
      provider_event_id: "91000000-0000-4000-8000-000000000001",
      provider_payment_id: paymentId,
      event_type: "payment_paid",
      provider_status: "paid",
      provider_amount: 35000,
      provider_currency: "SAR",
      provider_order_id: orderId,
      provider_payload: expect.objectContaining({ id: paymentId }),
      failure_detail: "",
    });
    expect(attemptPaymentReceipt).toHaveBeenCalledWith(orderId);
  });

  it("allows a callback to confirm only the signed-in learner's order", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "10000000-0000-4000-8000-000000000099" },
      error: null,
    });
    const rpc = vi.fn();
    const admin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle }),
        }),
      }),
      rpc,
    };
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(
      confirmMoyasarPayment(paymentId, {
        kind: "callback",
        expectedUserId: userId,
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "payment_not_found",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("records an authenticated abandoned event as a failed attempt", async () => {
    vi.mocked(fetchMoyasarPayment).mockResolvedValue(
      verifiedPayment("initiated") as Awaited<
        ReturnType<typeof fetchMoyasarPayment>
      >,
    );
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          order_status: "failed",
          enrollment_id: null,
          state_changed: true,
        },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);

    await confirmMoyasarPayment(paymentId, {
      kind: "webhook",
      eventId: "91000000-0000-4000-8000-000000000002",
      eventType: "payment_abandoned",
    });

    expect(rpc).toHaveBeenCalledWith(
      "process_verified_moyasar_payment",
      expect.objectContaining({
        provider_status: "failed",
        failure_detail: "Payment was abandoned",
      }),
    );
    expect(attemptPaymentReceipt).not.toHaveBeenCalled();
  });

  it("keeps a verified payment successful when receipt delivery fails", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          order_status: "paid",
          enrollment_id: enrollmentId,
          state_changed: true,
        },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
    vi.mocked(attemptPaymentReceipt).mockResolvedValue({
      status: "failed",
      code: "resend_http_503",
    });

    await expect(
      confirmMoyasarPayment(paymentId, {
        kind: "webhook",
        eventId: "91000000-0000-4000-8000-000000000004",
        eventType: "payment_paid",
      }),
    ).resolves.toEqual({
      orderId,
      orderStatus: "paid",
      enrollmentId,
      stateChanged: true,
    });
  });

  it("returns a safe temporary error when Moyasar is unavailable", async () => {
    vi.mocked(fetchMoyasarPayment).mockRejectedValue(
      new MoyasarApiError("fetch payment", 503),
    );

    await expect(
      confirmMoyasarPayment(paymentId, {
        kind: "webhook",
        eventId: "91000000-0000-4000-8000-000000000003",
        eventType: "payment_paid",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentConfirmationError>>({
        status: 502,
        code: "payment_provider_unavailable",
      }),
    );
  });
});
