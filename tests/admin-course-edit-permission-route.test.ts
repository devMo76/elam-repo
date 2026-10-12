import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));

import { PATCH } from "@/app/api/admin/courses/[courseId]/edit-permission/route";
import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError } from "@/lib/http/api-response";

const courseId = "49110000-0000-4000-8000-000000000001";
const rpc = vi.fn();
const context = { params: Promise.resolve({ courseId }) };

function request(body: unknown) {
  return new Request(`http://localhost/api/admin/courses/${courseId}/edit-permission`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({
    authorized: true,
    supabase: { rpc },
    user: { id: "30000000-0000-4000-8000-000000000001" },
  } as never);
});

describe("admin course edit permission route and service", () => {
  it.each([true, false])("persists permission %s through the protected RPC", async (allowed) => {
    rpc.mockResolvedValue({ data: allowed, error: null });
    const response = await PATCH(request({ publishedEditsAllowed: allowed }), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: { courseId, publishedEditsAllowed: allowed } });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_set_course_edit_permission", {
      target_course_id: courseId, allow_edits: allowed,
    });
  });

  it.each([401, 403])("returns authorization failure %s before accessing the database", async (status) => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false, response: createApiError(status, "denied", "Access denied."),
    });
    const response = await PATCH(request({ publishedEditsAllowed: true }), context);
    expect(response.status).toBe(status);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    {}, { publishedEditsAllowed: "true" }, { publishedEditsAllowed: 1 },
    { publishedEditsAllowed: null },
    { publishedEditsAllowed: true, actorId: "forged-actor" },
  ])("rejects an invalid or forged request %j", async (body) => {
    const response = await PATCH(request(body), context);
    expect(response.status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before calling the RPC", async () => {
    const response = await PATCH(new Request("http://localhost", { method: "PATCH", body: "{" }), context);
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid course ID", async () => {
    const response = await PATCH(request({ publishedEditsAllowed: true }), {
      params: Promise.resolve({ courseId: "invalid" }),
    });
    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", 403, "forbidden"],
    ["P0002", 404, "course_not_found"],
    ["22023", 422, "invalid_edit_permission"],
    ["XX000", 500, "admin_course_permission_failed"],
  ])("maps database error %s without leaking details", async (code, status, expectedCode) => {
    rpc.mockResolvedValue({ data: null, error: { code, message: "internal database details" } });
    const response = await PATCH(request({ publishedEditsAllowed: true }), context);
    expect(response.status).toBe(status);
    const payload = await response.json();
    expect(payload.error.code).toBe(expectedCode);
    expect(JSON.stringify(payload)).not.toContain("internal database details");
  });

  it("fails closed if the RPC returns no permission", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(request({ publishedEditsAllowed: true }), context);
    expect(response.status).toBe(500);
  });

  it("handles a connection failure without reporting success", async () => {
    rpc.mockRejectedValue(new Error("connection failed"));
    const response = await PATCH(request({ publishedEditsAllowed: true }), context);
    expect(response.status).toBe(500);
  });
});
