import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));
import { PATCH } from "@/app/api/admin/courses/[courseId]/edit-permission/route";
import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError } from "@/lib/http/api-response";

beforeEach(() => vi.resetAllMocks());
describe("retired course-level edit grants", () => {
  it("directs admins to instructor permissions without making a database write", async () => {
    const rpc = vi.fn();
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase: { rpc } } as never);
    const response = await PATCH();
    expect(response.status).toBe(410);
    expect((await response.json()).error.code).toBe("instructor_permission_required");
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([401, 403])("preserves access checks for status %s", async status => {
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: false, response: createApiError(status, "forbidden", "Denied") });
    expect((await PATCH()).status).toBe(status);
  });
});
