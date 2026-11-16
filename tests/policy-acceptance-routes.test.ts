import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/env/public", () => ({ getPublicEnvironment: () => ({ NEXT_PUBLIC_SITE_URL: "https://elam.example" }) }));
vi.mock("@/lib/http/rate-limit", () => ({ checkRateLimits: vi.fn(async () => null) }));
import { createClient } from "@/lib/supabase/server";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as accept } from "@/app/api/auth/policy/route";
import { CURRENT_POLICY_VERSION } from "@/lib/policy-version";

const signUp = vi.fn();
const rpc = vi.fn();
const getUser = vi.fn();
const validAgreement = { policyAccepted: true, policyVersion: CURRENT_POLICY_VERSION };
const registration = { email: "learner@example.com", fullName: "New Learner", password: "safe-password" };
function request(body: unknown) {
  return new Request("https://elam.example/api/auth/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "existing-instructor" } }, error: null });
  signUp.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser, signUp }, rpc } as never);
});
describe("registration policy enforcement", () => {
  it.each([{}, { policyAccepted: false, policyVersion: CURRENT_POLICY_VERSION }, { policyAccepted: "true", policyVersion: CURRENT_POLICY_VERSION }, { policyAccepted: true, policyVersion: "obsolete" }])("rejects missing, false, coerced or outdated consent before creating an account: %j", async consent => {
    expect((await register(request({ ...registration, ...consent }))).status).toBe(422);
    expect(signUp).not.toHaveBeenCalled();
  });
  it("passes only the affirmative version to the atomic signup trigger, without client timestamps", async () => {
    expect((await register(request({ ...registration, ...validAgreement }))).status).toBe(202);
    expect(signUp.mock.calls[0][0].options.data).toEqual({ full_name: "New Learner", policy_acceptance: { accepted: true, version: CURRENT_POLICY_VERSION } });
  });
});
describe("existing account acceptance", () => {
  it("requires an authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await accept(request(validAgreement))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([{}, { policyAccepted: false, policyVersion: CURRENT_POLICY_VERSION }, { ...validAgreement, userId: "another-user" }, { ...validAgreement, acceptedAt: "2000-01-01" }, { policyAccepted: true, policyVersion: "old" }])("rejects invalid or forged agreement payload %j", async body => {
    expect((await accept(request(body))).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("saves for the authenticated identity using the version-only RPC", async () => {
    const response = await accept(request(validAgreement));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(rpc).toHaveBeenCalledWith("accept_current_policy", { requested_version: CURRENT_POLICY_VERSION });
  });
  it("does not report success if persistence fails", async () => {
    rpc.mockResolvedValue({ error: { message: "database unavailable" } });
    expect((await accept(request(validAgreement))).status).toBe(503);
  });
});
