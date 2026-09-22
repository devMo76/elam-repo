import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { changeAdminCourseStatus, getAdminCourses } from "./courses";

describe("admin course readiness", () => {
  it("maps curriculum counts into the reviewer publication signal", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        course_id: "40000000-0000-4000-8000-000000000001",
        course_slug: "signals",
        course_code: "EE201",
        course_title: "Signals",
        course_status: "in_review",
        instructor_id: "30000000-0000-4000-8000-000000000001",
        instructor_name: "Instructor",
        created_at: "2026-09-18T12:00:00Z",
        published_at: null,
        module_count: 2,
        lesson_count: 4,
        unready_lesson_count: 1,
        total_count: 1,
      }],
      error: null,
    });

    const result = await getAdminCourses({ rpc } as never, {
      status: "in_review",
      page: 1,
      pageSize: 20,
    });

    expect(result.data[0].readiness).toEqual({
      canPublish: false,
      moduleCount: 2,
      lessonCount: 4,
      unreadyLessonCount: 1,
    });
  });

  it("reports ready only when structure exists and every lesson is playable", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        course_id: "40000000-0000-4000-8000-000000000001",
        course_slug: "signals",
        course_code: null,
        course_title: "Signals",
        course_status: "in_review",
        instructor_id: "30000000-0000-4000-8000-000000000001",
        instructor_name: "Instructor",
        created_at: "2026-09-18T12:00:00Z",
        published_at: null,
        module_count: 1,
        lesson_count: 2,
        unready_lesson_count: 0,
        total_count: 1,
      }],
      error: null,
    });

    const result = await getAdminCourses({ rpc } as never, { page: 1, pageSize: 20 });
    expect(result.data[0].readiness.canPublish).toBe(true);
  });

  it("preserves the backend readiness guard when an admin tries to publish", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "23514" } });

    await expect(
      changeAdminCourseStatus(
        { rpc } as never,
        "40000000-0000-4000-8000-000000000001",
        "published",
      ),
    ).rejects.toMatchObject({ status: 409, code: "course_not_ready" });
  });
});
