import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/courses", () => ({
  AdminCourseError: class AdminCourseError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
  changeAdminCourseStatus: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));

import { PATCH } from "@/app/api/admin/courses/[courseId]/status/route";
import { changeAdminCourseStatus } from "@/lib/admin/courses";
import { requireAdmin } from "@/lib/auth/authorization";

const courseId = "40000000-0000-4000-8000-000000000003";
afterEach(() => vi.clearAllMocks());

describe("admin course status route", () => {
  it("changes a course status for an administrator", async () => {
    const supabase = {};
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase, user: { id: "30000000-0000-4000-8000-000000000001" } } as never);
    vi.mocked(changeAdminCourseStatus).mockResolvedValue({ data: { courseId, status: "published", publishedAt: "2026-09-06T12:00:00Z" } });
    const request = new Request("http://localhost", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "published" }) });

    const response = await PATCH(request, { params: Promise.resolve({ courseId }) });
    expect(response.status).toBe(200);
    expect(changeAdminCourseStatus).toHaveBeenCalledWith(supabase, courseId, "published");
  });

  it("rejects attempts to set the review status", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase: {}, user: { id: "30000000-0000-4000-8000-000000000001" } } as never);
    const request = new Request("http://localhost", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in_review" }) });
    const response = await PATCH(request, { params: Promise.resolve({ courseId }) });
    expect(response.status).toBe(422);
    expect(changeAdminCourseStatus).not.toHaveBeenCalled();
  });
});
