import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin/view", () => ({ getAdminView: vi.fn() }));
vi.mock("@/lib/admin/course-review", () => ({ getAdminCourseReview: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
import Page from "@/app/(admin)/admin/courses/[courseId]/page";
import { getAdminView } from "@/lib/admin/view";
import { getAdminCourseReview } from "@/lib/admin/course-review";

afterEach(() => vi.resetAllMocks());
describe("admin review route access", () => {
  it("requires the admin guard before reading any review content", async () => {
    vi.mocked(getAdminView).mockRejectedValue(new Error("access-denied"));
    await expect(Page({ params: Promise.resolve({ courseId: "40000000-0000-4000-8000-000000000001" }) })).rejects.toThrow("access-denied");
    expect(getAdminCourseReview).not.toHaveBeenCalled();
  });
  it("rejects invalid identifiers before querying a course", async () => {
    vi.mocked(getAdminView).mockResolvedValue({ supabase: {} } as never);
    await expect(Page({ params: Promise.resolve({ courseId: "invalid" }) })).rejects.toThrow("not-found");
    expect(getAdminCourseReview).not.toHaveBeenCalled();
  });
  it("shows not found when a course is unavailable", async () => {
    vi.mocked(getAdminView).mockResolvedValue({ supabase: {} } as never);
    vi.mocked(getAdminCourseReview).mockResolvedValue(null);
    await expect(Page({ params: Promise.resolve({ courseId: "40000000-0000-4000-8000-000000000001" }) })).rejects.toThrow("not-found");
  });
});
