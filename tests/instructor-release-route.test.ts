import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/authoring/access", () => ({ requireInstructorAuthoringContext: vi.fn() }));
import { POST } from "@/app/api/instructor/courses/[courseId]/release/route";
import { requireInstructorAuthoringContext } from "@/lib/authoring/access";
import { AuthoringError } from "@/lib/authoring/errors";
const courseId = "49130000-0000-4000-8000-000000000001";
const rpc = vi.fn();
const context = { params: Promise.resolve({ courseId }) };
const request = () => new Request("http://localhost/api/instructor/courses/release", { method: "POST" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({ supabase: { rpc } } as never);
});
describe("release additions route", () => {
  it.each([0, 3])("returns the committed release count %s, including idempotent retry", async (count) => {
    rpc.mockResolvedValue({ data: count, error: null });
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: { releasedLessonCount: count } });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("release_course_additions", { target_course_id: courseId });
  });
  it.each([401, 403])("enforces authentication and role (%s)", async (status) => {
    vi.mocked(requireInstructorAuthoringContext).mockRejectedValue(new AuthoringError(status, "forbidden", "Denied"));
    expect((await POST(request(), context)).status).toBe(status);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid identifiers", async () => {
    expect((await POST(request(), { params: Promise.resolve({ courseId: "bad" }) })).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([["23514", 409], ["42501", 403], ["XX000", 500]])("maps database failure %s without success or details", async (code, status) => {
    rpc.mockResolvedValue({ data: null, error: { code, message: "internal secret" } });
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain("internal secret");
  });
  it.each([null, undefined, -1, 1.5, "2"])("fails closed on invalid RPC result %s", async (data) => {
    rpc.mockResolvedValue({ data, error: null });
    expect((await POST(request(), context)).status).toBe(500);
  });
  it("reports a recoverable connection failure", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    expect((await POST(request(), context)).status).toBe(500);
  });
});
