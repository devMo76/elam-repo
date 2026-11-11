import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getAdminCourseReview } from "./course-review";

const courseId = "40000000-0000-4000-8000-000000000001";
const moduleId = "50000000-0000-4000-8000-000000000001";
const raw = {
  id: courseId, slug: "review-fixture", title: "Review course", department: "Engineering", course_code: null,
  subtitle: null, description: "Course description", price_halalas: 1000, currency: "SAR", status: "in_review",
  cover_url: null, created_at: "2026-11-11T00:00:00Z", published_at: null,
  instructor: { full_name: "Reviewer fixture instructor", role: "instructor", instructor_published_updates_allowed: false },
  modules: [{ id: moduleId, course_id: courseId, title: "Unit", position: 1, is_pending: true,
    lessons: [2, 1].map(position => ({ id: `60000000-0000-4000-8000-00000000000${position}`,
      module_id: moduleId, title: `Lesson ${position}`, position, is_pending: true,
      duration_seconds: 60, is_free_preview: false, media_status: "ready" })) }],
};
function client(data: unknown, error: unknown = null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
  return { from: vi.fn().mockReturnValue(query) };
}
describe("admin review content", () => {
  it("reads submitted and private curriculum through the authenticated client, ordered for review", async () => {
    const supabase = client(raw);
    const result = await getAdminCourseReview(supabase as never, courseId);
    expect(result?.course.status).toBe("in_review");
    expect(result?.instructorName).toBe(raw.instructor.full_name);
    expect(result?.course.description).toBe(raw.description);
    expect(result?.course.modules[0].lessons.map(lesson => lesson.position)).toEqual([1, 2]);
    expect(result?.course.modules[0].lessons.every(lesson => lesson.isPending)).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("courses");
    expect(supabase.from().eq).toHaveBeenCalledWith("id", courseId);
    expect(supabase.from().select.mock.calls[0][0]).not.toMatch(/video_asset_id|storage_path/);
  });
  it("returns null for missing or RLS-hidden courses", async () => {
    expect(await getAdminCourseReview(client(null) as never, courseId)).toBeNull();
  });
  it("inherits the current instructor permission when reviewing a published course", async () => {
    const supabase = client({ ...raw, status: "published" });
    const query = supabase.from();
    Object.assign(query, { in: vi.fn().mockResolvedValue({ data: [{ id: courseId,
      instructor: { role: "instructor", instructor_published_updates_allowed: true } }], error: null }) });
    const result = await getAdminCourseReview(supabase as never, courseId);
    expect(result?.course.publishedEditsAllowed).toBe(true);
  });
  it("fails visibly when content loading fails instead of showing an empty curriculum", async () => {
    await expect(getAdminCourseReview(client(null, { message: "unavailable" }) as never, courseId))
      .rejects.toMatchObject({ code: "admin_course_review_failed" });
  });
});
