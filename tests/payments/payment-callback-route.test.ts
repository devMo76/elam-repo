import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/public", () => ({
  getPublicEnvironment: vi.fn(),
}));
vi.mock("@/lib/payments/confirmation", () => ({
  confirmMoyasarPayment: vi.fn(),
  PaymentConfirmationError: class PaymentConfirmationError extends Error {},
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { GET } from "@/app/api/payments/callback/route";
import { getPublicEnvironment } from "@/lib/env/public";
import { confirmMoyasarPayment } from "@/lib/payments/confirmation";
import { createClient } from "@/lib/supabase/server";

const paymentId = "90000000-0000-4000-8000-000000000001";
const userId = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublicEnvironment).mockReturnValue({
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: "pk_test_publickey",
    NEXT_PUBLIC_SITE_URL: "https://example.com",
  });
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
});

describe("payment callback route", () => {
  it("does not verify a forged or invalid payment id", async () => {
    const response = await GET(
      new Request("https://example.com/api/payments/callback?id=not-a-payment"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.com/?payment=failed",
    );
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("requires a signed-in learner", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    const response = await GET(
      new Request(
        `https://example.com/api/payments/callback?id=${paymentId}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/?payment=sign_in_required",
    );
    expect(confirmMoyasarPayment).not.toHaveBeenCalled();
  });

  it("redirects to success only after server confirmation", async () => {
    vi.mocked(confirmMoyasarPayment).mockResolvedValue({
      orderId: "70000000-0000-4000-8000-000000000001",
      orderStatus: "paid",
      enrollmentId: "80000000-0000-4000-8000-000000000001",
      stateChanged: true,
    });

    const response = await GET(
      new Request(
        `https://example.com/api/payments/callback?id=${paymentId}`,
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://example.com/?payment=success",
    );
    expect(confirmMoyasarPayment).toHaveBeenCalledWith(paymentId, {
      kind: "callback",
      expectedUserId: userId,
    });
  });
});
