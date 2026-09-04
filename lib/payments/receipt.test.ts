import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/email/resend", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/email/resend")>();

  return {
    ...original,
    sendEmail: vi.fn(),
  };
});

import { ResendApiError, sendEmail } from "@/lib/email/resend";
import { attemptPaymentReceipt } from "@/lib/payments/receipt";
import { createAdminClient } from "@/lib/supabase/admin";

const orderId = "70000000-0000-4000-8000-000000000001";

function queryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  };
}

function createReceiptAdmin(shouldSend = true) {
  const rpc = vi.fn().mockImplementation((functionName: string) => {
    if (functionName === "claim_payment_receipt") {
      return Promise.resolve({
        data: [
          {
            should_send: shouldSend,
            receipt_status: shouldSend ? "pending" : "sent",
            attempt_count: 1,
          },
        ],
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  });
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "orders") {
      return queryResult({
        user_id: "10000000-0000-4000-8000-000000000001",
        course_id: "40000000-0000-4000-8000-000000000001",
        amount_halalas: 35000,
        currency: "SAR",
        paid_at: "2026-09-02T10:00:00.000Z",
        status: "paid",
      });
    }

    if (table === "courses") {
      return queryResult({ title: "Backend Basics" });
    }

    return queryResult({ full_name: "Learner One" });
  });
  const getUserById = vi.fn().mockResolvedValue({
    data: { user: { email: "learner@example.com" } },
    error: null,
  });

  return {
    admin: { rpc, from, auth: { admin: { getUserById } } },
    rpc,
    from,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendEmail).mockResolvedValue({ id: "email-1" });
});

describe("payment receipt delivery", () => {
  it("sends and completes a claimed receipt", async () => {
    const { admin, rpc } = createReceiptAdmin();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(attemptPaymentReceipt(orderId)).resolves.toEqual({
      status: "sent",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `payment-receipt/${orderId}`,
        to: "learner@example.com",
      }),
    );
    expect(rpc).toHaveBeenCalledWith("complete_payment_receipt", {
      target_order: orderId,
      email_id: "email-1",
    });
  });

  it("does no email work when another worker already owns the receipt", async () => {
    const { admin, from } = createReceiptAdmin(false);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(attemptPaymentReceipt(orderId)).resolves.toEqual({
      status: "skipped",
    });

    expect(from).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records a safe failure without throwing into payment confirmation", async () => {
    const { admin, rpc } = createReceiptAdmin();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockRejectedValue(new ResendApiError("resend_http_503"));

    await expect(attemptPaymentReceipt(orderId)).resolves.toEqual({
      status: "failed",
      code: "resend_http_503",
    });

    expect(rpc).toHaveBeenCalledWith("record_payment_receipt_failure", {
      target_order: orderId,
      error_code: "resend_http_503",
    });
  });
});
