import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getMoyasarApiEnvironment: vi.fn(),
  getMoyasarWebhookEnvironment: vi.fn(),
}));
vi.mock("@/lib/payments/confirmation", () => ({
  confirmMoyasarPayment: vi.fn(),
  PaymentConfirmationError: class PaymentConfirmationError extends Error {},
}));

import { POST } from "@/app/api/webhooks/moyasar/route";
import {
  getMoyasarApiEnvironment,
  getMoyasarWebhookEnvironment,
} from "@/lib/env/server";
import { confirmMoyasarPayment } from "@/lib/payments/confirmation";

const paymentId = "90000000-0000-4000-8000-000000000001";
const eventId = "91000000-0000-4000-8000-000000000001";

function createWebhook(secretToken: string, live = false) {
  return new Request("https://example.com/api/webhooks/moyasar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: eventId,
      type: "payment_paid",
      created_at: "2026-09-02T08:00:00.000Z",
      secret_token: secretToken,
      live,
      data: { id: paymentId },
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMoyasarWebhookEnvironment).mockReturnValue({
    MOYASAR_WEBHOOK_SECRET: "a-secure-webhook-secret",
  });
  vi.mocked(getMoyasarApiEnvironment).mockReturnValue({
    MOYASAR_SECRET_KEY: "sk_test_serversecret",
  });
  vi.mocked(confirmMoyasarPayment).mockResolvedValue({
    orderId: "70000000-0000-4000-8000-000000000001",
    orderStatus: "paid",
    enrollmentId: "80000000-0000-4000-8000-000000000001",
    stateChanged: true,
  });
});

describe("Moyasar webhook route", () => {
  it("rejects an invalid secret before processing the payment", async () => {
    const response = await POST(createWebhook("wrong-webhook-secret"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_webhook_secret" },
    });
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("rejects live events in the sandbox environment", async () => {
    const response = await POST(
      createWebhook("a-secure-webhook-secret", true),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unexpected_payment_mode" },
    });
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("verifies an authentic event through the shared confirmation service", async () => {
    const response = await POST(
      createWebhook("a-secure-webhook-secret"),
    );

    expect(response.status).toBe(204);
    expect(confirmMoyasarPayment).toHaveBeenCalledWith(paymentId, {
      kind: "webhook",
      eventId,
      eventType: "payment_paid",
    });
  });
});
