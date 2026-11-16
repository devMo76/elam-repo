import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`); }) }));
import { createClient } from "@/lib/supabase/server";
import PolicyAcceptancePage from "@/app/(auth)/auth/policy/page";
import { PolicyAcceptanceDialog } from "@/components/auth/PolicyAcceptanceDialog";

const rpc = vi.fn();
const maybeSingle = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: false, error: null });
  maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "account-1" } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }), rpc,
  } as never);
});
describe("policy dialog role exemption", () => {
  it("redirects an admin away from a directly opened consent page", async () => {
    await expect(PolicyAcceptancePage({ searchParams: Promise.resolve({ next: "/admin/users" }) })).rejects.toThrow("redirect:/admin/users");
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["instructor", "learner"])("still shows the dialog to an unaccepted %s", async role => {
    maybeSingle.mockResolvedValue({ data: { role }, error: null });
    const page = await PolicyAcceptancePage({ searchParams: Promise.resolve({ next: "/account" }) });
    expect(page.type).toBe(PolicyAcceptanceDialog);
    expect(rpc).toHaveBeenCalledWith("has_current_policy_acceptance");
  });
});
