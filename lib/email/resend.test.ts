import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getEmailEnvironment: vi.fn(() => ({
    EMAIL_API_KEY: "re_test_key",
    EMAIL_FROM_ADDRESS: "Elam <receipts@example.com>",
  })),
}));

import { ResendApiError, sendEmail } from "@/lib/email/resend";

const emailInput = {
  idempotencyKey: "payment-receipt/order-1",
  to: "learner@example.com",
  subject: "Receipt",
  html: "<p>Paid</p>",
  text: "Paid",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Resend email adapter", () => {
  it("uses a stable idempotency key and keeps the API key in the header", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(sendEmail(emailInput)).resolves.toEqual({ id: "email-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Idempotency-Key": "payment-receipt/order-1",
        }),
      }),
    );
  });

  it("returns a safe error code when Resend rejects the request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    await expect(sendEmail(emailInput)).rejects.toEqual(
      expect.objectContaining<Partial<ResendApiError>>({
        code: "resend_http_429",
      }),
    );
  });
});
