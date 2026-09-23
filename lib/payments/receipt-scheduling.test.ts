import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/payments/receipt", () => ({
  attemptPaymentReceipt: vi.fn(),
}));

import { after } from "next/server";

import { attemptPaymentReceipt } from "@/lib/payments/receipt";
import { schedulePaymentReceipt } from "@/lib/payments/receipt-scheduling";

const orderId = "70000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("payment receipt scheduling", () => {
  it("keeps slow email work outside the payment response path", async () => {
    let deferredWork: (() => Promise<void>) | undefined;
    vi.mocked(after).mockImplementation((callback) => {
      deferredWork = callback as () => Promise<void>;
    });
    vi.mocked(attemptPaymentReceipt).mockImplementation(
      () => new Promise(() => undefined),
    );

    schedulePaymentReceipt(orderId);

    expect(attemptPaymentReceipt).not.toHaveBeenCalled();
    expect(deferredWork).toBeTypeOf("function");

    void deferredWork?.();
    expect(attemptPaymentReceipt).toHaveBeenCalledWith(orderId);
  });
});
