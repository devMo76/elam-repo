import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ SUPABASE_SERVICE_ROLE_KEY: "test-server-key" }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimits } from "./rate-limit";

const rpc = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
});

describe("shared API rate limit", () => {
  const request = new Request("https://example.com/api/auth/sign-in", {
    headers: { "x-forwarded-for": "203.0.113.5" },
  });

  it("allows requests within the database limit without exposing the address", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await checkRateLimits(request, [{ action: "auth_sign_in", limit: 8, windowSeconds: 900 }])).toBeNull();
    expect(rpc).toHaveBeenCalledWith("consume_api_rate_limit", expect.objectContaining({
      target_action: "auth_sign_in", target_limit: 8, target_window_seconds: 900,
      target_key_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("203.0.113.5");
  });

  it("returns a retryable 429 when denied", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const response = await checkRateLimits(request, [{ action: "checkout", limit: 12, windowSeconds: 600 }]);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("600");
  });

  it("fails closed when the shared store is unavailable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    const response = await checkRateLimits(request, [{ action: "checkout", limit: 12, windowSeconds: 600 }]);
    expect(response?.status).toBe(503);
  });
});
