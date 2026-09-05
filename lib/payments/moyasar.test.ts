import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  fetchMoyasarPayment,
  isExpectedMoyasarMode,
  verifyMoyasarWebhookSecret,
} from "@/lib/payments/moyasar";

const paymentId = "90000000-0000-4000-8000-000000000001";
const orderId = "70000000-0000-4000-8000-000000000001";

function configureEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv(
    ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
    "test-service-role",
  );
  vi.stubEnv("MOYASAR_SECRET_KEY", "sk_test_serversecret");
}

function createPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: paymentId,
    status: "paid",
    amount: 35000,
    currency: "SAR",
    metadata: { order_id: orderId },
    source: { message: null },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Moyasar adapter", () => {
  it("fetches and validates a payment using server-only Basic auth", async () => {
    configureEnvironment();
    const fetchMock = vi.fn().mockResolvedValue(Response.json(createPayment()));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMoyasarPayment(paymentId)).resolves.toMatchObject({
      payment: {
        id: paymentId,
        status: "paid",
        amount: 35000,
        currency: "SAR",
      },
    });

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`https://api.moyasar.com/v1/payments/${paymentId}`);
    expect(options).toMatchObject({ cache: "no-store" });
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from("sk_test_serversecret:").toString("base64")}`,
    );
  });

  it("rejects an invalid provider response", async () => {
    configureEnvironment();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(createPayment({ amount: "35000" }))),
    );

    await expect(fetchMoyasarPayment(paymentId)).rejects.toThrow(
      "Moyasar API operation failed: fetch payment: invalid response",
    );
  });

  it("compares webhook secrets exactly", () => {
    expect(
      verifyMoyasarWebhookSecret(
        "a-secure-webhook-secret",
        "a-secure-webhook-secret",
      ),
    ).toBe(true);
    expect(
      verifyMoyasarWebhookSecret(
        "a-secure-webhook-secret",
        "a-different-webhook-secret",
      ),
    ).toBe(false);
  });

  it("rejects webhooks from the wrong payment mode", () => {
    expect(isExpectedMoyasarMode(false, "sk_test_example")).toBe(true);
    expect(isExpectedMoyasarMode(true, "sk_test_example")).toBe(false);
    expect(isExpectedMoyasarMode(true, "sk_live_example")).toBe(true);
  });
});
