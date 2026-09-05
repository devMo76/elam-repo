import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/public", () => ({
  getPublicEnvironment: vi.fn(),
}));
vi.mock("@/lib/env/server", () => ({
  getMoyasarApiEnvironment: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getPublicEnvironment } from "@/lib/env/public";
import { getMoyasarApiEnvironment } from "@/lib/env/server";
import { CheckoutError, createCheckout } from "@/lib/payments/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const courseId = "40000000-0000-4000-8000-000000000001";
const orderId = "70000000-0000-4000-8000-000000000001";
const userId = "10000000-0000-4000-8000-000000000001";

function configurePaymentEnvironment() {
  vi.mocked(getPublicEnvironment).mockReturnValue({
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: "pk_test_publickey",
    NEXT_PUBLIC_SITE_URL: "https://example.com",
  });
  vi.mocked(getMoyasarApiEnvironment).mockReturnValue({
    MOYASAR_SECRET_KEY: "sk_test_secretkey",
  });
}

function createSessionClient(emailConfirmed = true) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: userId,
            email_confirmed_at: emailConfirmed
              ? "2026-09-02T08:00:00.000Z"
              : null,
          },
        },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { role: "learner" },
            error: null,
          }),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  configurePaymentEnvironment();
});

describe("checkout service", () => {
  it("creates a pending order using database-owned payment values", async () => {
    vi.mocked(createClient).mockResolvedValue(createSessionClient() as never);
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          order_id: orderId,
          amount_halalas: 35000,
          currency: "SAR",
          order_status: "pending",
        },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);

    await expect(createCheckout(courseId)).resolves.toEqual({
      data: {
        orderId,
        amount: 35000,
        currency: "SAR",
        description: `Elam course order ${orderId}`,
        publishableApiKey: "pk_test_publickey",
        callbackUrl: "https://example.com/api/payments/callback",
        metadata: { order_id: orderId },
      },
    });
    expect(rpc).toHaveBeenCalledWith("create_pending_order", {
      target_user: userId,
      target_course: courseId,
    });
  });

  it("requires a verified learner email before creating an order", async () => {
    vi.mocked(createClient).mockResolvedValue(
      createSessionClient(false) as never,
    );
    const rpc = vi.fn();
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);

    await expect(createCheckout(courseId)).rejects.toMatchObject({
      status: 403,
      code: "email_verification_required",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects mismatched public and secret payment modes", async () => {
    vi.mocked(createClient).mockResolvedValue(createSessionClient() as never);
    vi.mocked(getPublicEnvironment).mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: "pk_live_publickey",
      NEXT_PUBLIC_SITE_URL: "https://example.com",
    });

    await expect(createCheckout(courseId)).rejects.toEqual(
      expect.objectContaining<Partial<CheckoutError>>({
        status: 500,
        code: "payment_configuration_invalid",
      }),
    );
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
