import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { toAuthoringCourse } from "@/lib/authoring/transform";
import { getAdminCourseEditPermissions } from "@/lib/admin/courses";

const raw = {
  id: "40000000-0000-4000-8000-000000000001", slug: "permission-fixture", title: "Course",
  department: "Engineering", course_code: null, subtitle: null, description: null,
  price_halalas: 1000, currency: "SAR", status: "published" as const, cover_url: null,
  created_at: "2026-11-07T00:00:00Z", published_at: "2026-11-07T00:00:00Z",
};
describe("derived instructor permission source", () => {
  it("derives allowed course DTOs from their instructor", () => {
    const first = toAuthoringCourse({ ...raw, instructor: { role: "instructor", instructor_published_updates_allowed: true } });
    const second = toAuthoringCourse({ ...raw, id: "40000000-0000-4000-8000-000000000002", instructor: { role: "instructor", instructor_published_updates_allowed: true } });
    expect(first.publishedEditsAllowed).toBe(true);
    expect(second.publishedEditsAllowed).toBe(true);
  });
  it("ignores legacy course grants and defaults missing instructor data to locked", () => {
    const legacy = { ...raw, instructor_published_edits_allowed: true };
    expect(toAuthoringCourse(legacy).publishedEditsAllowed).toBe(false);
    expect(toAuthoringCourse({ ...legacy, instructor: { role: "instructor", instructor_published_updates_allowed: false } }).publishedEditsAllowed).toBe(false);
    expect(toAuthoringCourse({ ...legacy, instructor: { role: "learner", instructor_published_updates_allowed: true } }).publishedEditsAllowed).toBe(false);
  });
  it("admin course badges inherit the same source rather than the legacy flag", async () => {
    const rows = [{ id: raw.id, instructor_published_edits_allowed: true, instructor: { role: "instructor", instructor_published_updates_allowed: false } }];
    const query = { in: vi.fn().mockResolvedValue({ data: rows, error: null }) };
    const supabase = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(query) }) };
    const result = await getAdminCourseEditPermissions(supabase as never, [raw.id]);
    expect(result.get(raw.id)).toBe(false);
  });
});
