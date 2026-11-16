import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/env/public", () => ({ getPublicEnvironment: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public" }) }));
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";
const rpc = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  rpc.mockResolvedValue({ data: false, error: null });
  maybeSingle.mockResolvedValue({ data: { role: "instructor" }, error: null });
  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    options?.cookies?.setAll?.([{ name: "refreshed-session", value: "fresh", options: { httpOnly: true } }], {});
    return { auth: { getUser }, rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as never;
  });
});
describe("server policy gate", () => {
  it.each(["/admin", "/api/admin/users", "/courses", "/studio"])("exempts database-verified admins on %s without fabricating acceptance", async path => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    const response = await refreshSession(new NextRequest(`https://elam.example${path}`));
    expect(response.status).toBe(200);
    expect(response.cookies.get("refreshed-session")?.value).toBe("fresh");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not trust admin claims in user-editable metadata", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1", user_metadata: { role: "admin" } } }, error: null });
    maybeSingle.mockResolvedValue({ data: { role: "learner" }, error: null });
    expect((await refreshSession(new NextRequest("https://elam.example/api/checkout"))).status).toBe(403);
    expect(rpc).toHaveBeenCalled();
  });
  it("does not exempt a role lookup that failed", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "admin" }, error: { message: "unavailable" } });
    expect((await refreshSession(new NextRequest("https://elam.example/api/checkout"))).status).toBe(403);
  });
  it("redirects existing instructors and preserves their requested course and refreshed cookie", async () => {
    const response = await refreshSession(new NextRequest("https://elam.example/studio/courses/existing?tab=content"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://elam.example/auth/policy?next=%2Fstudio%2Fcourses%2Fexisting%3Ftab%3Dcontent");
    expect(response.cookies.get("refreshed-session")?.value).toBe("fresh");
  });
  it.each(["/api/instructor/courses", "/api/checkout", "/api/lessons/lesson/progress", "/api/admin/users"])("blocks bypass through %s", async path => {
    const response = await refreshSession(new NextRequest(`https://elam.example${path}`));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("policy_acceptance_required");
  });
  it("fails closed on database errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    expect((await refreshSession(new NextRequest("https://elam.example/api/checkout"))).status).toBe(503);
  });
  it("allows accepted users without redirecting", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect((await refreshSession(new NextRequest("https://elam.example/studio"))).status).toBe(200);
  });
  it("does not check anonymous browsing", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await refreshSession(new NextRequest("https://elam.example/courses"))).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["/policies", "/auth/policy", "/auth/reset-password", "/auth/callback", "/api/auth/sign-out", "/api/auth/policy", "/api/webhooks/moyasar", "/api/webhooks/bunny", "/api/jobs/payment-receipts", "/api/payments/callback", "/api/telemetry/web-vitals"])("preserves policy/recovery/provider path %s", async path => {
    expect((await refreshSession(new NextRequest(`https://elam.example${path}`))).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });
});
