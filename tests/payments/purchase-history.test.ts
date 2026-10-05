import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getLearnerPurchases } from "@/lib/payments/history";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const userId = "10000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("learner purchase history", () => {
  it("does not make a service-role read for another user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "another-user" } }, error: null }) },
    } as never);

    await expect(getLearnerPurchases(userId)).rejects.toThrow("Learner purchases could not be loaded.");
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("reads payment references only on the server for the verified owner", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    } as never);
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    await expect(getLearnerPurchases(userId)).resolves.toEqual([]);
    expect(from).toHaveBeenCalledWith("orders");
    expect(select).toHaveBeenCalledWith(expect.stringContaining("moyasar_payment_id"));
    expect(eq).toHaveBeenCalledWith("user_id", userId);
  });
});
