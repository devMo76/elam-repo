import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getPaymentReceiptWorkerEnvironment: vi.fn(),
}));
vi.mock("@/lib/payments/receipt", () => ({
  processPendingPaymentReceipts: vi.fn(),
}));

import { POST } from "@/app/api/jobs/payment-receipts/route";
import { getPaymentReceiptWorkerEnvironment } from "@/lib/env/server";
import { processPendingPaymentReceipts } from "@/lib/payments/receipt";

const workerSecret = "receipt-worker-secret-that-is-long-enough";

function createRequest(secret = workerSecret) {
  return new Request("https://example.com/api/jobs/payment-receipts", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPaymentReceiptWorkerEnvironment).mockReturnValue({
    PAYMENT_RECEIPT_WORKER_SECRET: workerSecret,
  });
  vi.mocked(processPendingPaymentReceipts).mockResolvedValue({
    selected: 2,
    sent: 1,
    failed: 1,
    skipped: 0,
  });
});

describe("payment receipt worker route", () => {
  it("rejects requests without the worker secret", async () => {
    const response = await POST(createRequest("wrong-secret"));

    expect(response.status).toBe(401);
    expect(processPendingPaymentReceipts).not.toHaveBeenCalled();
  });

  it("processes durable receipt work for an authenticated worker", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { selected: 2, sent: 1, failed: 1, skipped: 0 },
    });
    expect(processPendingPaymentReceipts).toHaveBeenCalledOnce();
  });

  it("returns a retryable error when the queue cannot be read", async () => {
    vi.mocked(processPendingPaymentReceipts).mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
  });
});
