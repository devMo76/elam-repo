import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/payments/confirmation", () => ({
  confirmMoyasarPayment: vi.fn(),
  PaymentConfirmationError: class PaymentConfirmationError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  },
}));
vi.mock("@/lib/payments/receipt-scheduling", () => ({ schedulePaymentReceipt: vi.fn() }));
vi.mock("@/lib/http/rate-limit", () => ({ checkRateLimits: vi.fn(async () => null) }));

import { POST } from "@/app/api/payments/recheck/route";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmMoyasarPayment } from "@/lib/payments/confirmation";
import { schedulePaymentReceipt } from "@/lib/payments/receipt-scheduling";
import { checkRateLimits } from "@/lib/http/rate-limit";

const userId = "10000000-0000-4000-8000-000000000001";
const orderId = "70000000-0000-4000-8000-000000000001";
const paymentId = "90000000-0000-4000-8000-000000000001";

function request(body: object) {
  return new Request("https://example.com/api/payments/recheck", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

function mockClient(order: { status: string; moyasar_payment_id: string | null } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: order, error: null });
  const ownerEq = vi.fn().mockReturnValue({ maybeSingle });
  const eq = vi.fn().mockReturnValue({ eq: ownerEq });
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
  } as never);
  return { from, eq, ownerEq, maybeSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("payment recheck", () => {
  it("does not verify an order owned by someone else", async () => {
    const { eq, ownerEq } = mockClient(null);
    const response = await POST(request({ orderId }));
    expect(response.status).toBe(404);
    expect(eq).toHaveBeenCalledWith("id", orderId);
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("does not call the provider after the shared recheck limit is reached", async () => {
    mockClient(null);
    vi.mocked(checkRateLimits).mockResolvedValueOnce(new Response(null, { status: 429 }));
    const response = await POST(request({ orderId }));
    expect(response.status).toBe(429);
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("does not create another payment when a pending order has no provider reference", async () => {
    mockClient({ status: "pending", moyasar_payment_id: null });
    const response = await POST(request({ orderId }));
    expect(response.status).toBe(409);
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("reconfirms an existing payment for its verified owner and schedules its receipt", async () => {
    const { from, ownerEq } = mockClient({ status: "paid", moyasar_payment_id: paymentId });
    vi.mocked(confirmMoyasarPayment).mockResolvedValue({
      orderId, orderStatus: "paid", enrollmentId: "80000000-0000-4000-8000-000000000001", stateChanged: false,
    });
    const response = await POST(request({ orderId }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { status: "paid", accessGranted: true } });
    expect(confirmMoyasarPayment).toHaveBeenCalledWith(paymentId, { kind: "callback", expectedUserId: userId });
    expect(from).toHaveBeenCalledWith("orders");
    expect(ownerEq).toHaveBeenCalledWith("user_id", userId);
    expect(schedulePaymentReceipt).toHaveBeenCalledWith(orderId);
  });

  it("does not use the service role for an unauthenticated request", async () => {
    mockClient(null);
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never);
    const response = await POST(request({ orderId }));
    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("accepts a callback payment ID but still verifies order ownership", async () => {
    mockClient(null);
    vi.mocked(confirmMoyasarPayment).mockResolvedValue({
      orderId, orderStatus: "pending", enrollmentId: null, stateChanged: false,
    } as never);
    const response = await POST(request({ paymentId }));
    expect(response.status).toBe(200);
    expect(confirmMoyasarPayment).toHaveBeenCalledWith(paymentId, { kind: "callback", expectedUserId: userId });
    expect(schedulePaymentReceipt).not.toHaveBeenCalled();
  });
});
