import { describe, expect, it } from "vitest";

import type {
  AuthoringCourse,
  InstructorAuthoringProfile,
} from "@/lib/contracts";

import { evaluateCourseReadiness } from "./readiness";

const courseId = "11111111-1111-4111-8111-111111111111";
const moduleId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";
const profileId = "44444444-4444-4444-8444-444444444444";

function createCourse(
  overrides: Partial<AuthoringCourse> = {},
): AuthoringCourse {
  return {
    id: courseId,
    slug: "signals-and-systems-ee301",
    department: "EE",
    courseCode: "EE301",
    title: "Signals and Systems",
    subtitle: "A practical introduction",
    description: "Learn the foundations of signal analysis.",
    priceHalalas: 0,
    currency: "SAR",
    status: "draft",
    coverUrl: "https://example.com/course-cover.jpg",
    createdAt: "2026-09-17T12:00:00.000Z",
    publishedAt: null,
    modules: [
      {
        id: moduleId,
        courseId,
        title: "Foundations",
        position: 1,
        lessons: [
          {
            id: lessonId,
            moduleId,
            title: "Introduction",
            position: 1,
            durationSeconds: 600,
            isFreePreview: false,
            mediaStatus: "ready",
          },
        ],
      },
    ],
    ...overrides,
  };
}

const completeProfile: InstructorAuthoringProfile = {
  id: profileId,
  fullName: "Instructor Example",
  avatarUrl: "https://example.com/instructor.jpg",
  headline: "Electrical engineering instructor",
  bio: "Teaches engineering through practical examples.",
};

describe("course readiness", () => {
  it("blocks an empty draft for its missing module and lesson", () => {
    const readiness = evaluateCourseReadiness({
      course: createCourse({ modules: [] }),
      instructorProfile: completeProfile,
    });

    expect(readiness.canSubmit).toBe(false);
    expect(readiness.blockers.map(({ code }) => code)).toEqual([
      "course_module_required",
      "course_lesson_required",
    ]);
  });

  it("identifies the exact lesson whose video is not ready", () => {
    const course = createCourse();
    course.modules[0].lessons[0].mediaStatus = "processing";

    const readiness = evaluateCourseReadiness({
      course,
      instructorProfile: completeProfile,
    });

    expect(readiness.canSubmit).toBe(false);
    expect(readiness.blockers).toContainEqual({
      code: "lesson_media_not_ready",
      message: "Wait for the lesson video to become playable or replace it.",
      target: "media",
      entityId: lessonId,
    });
  });

  it("allows the minimum usable course even when optional warnings remain", () => {
    const readiness = evaluateCourseReadiness({
      course: createCourse({ coverUrl: null, subtitle: null, description: null }),
      instructorProfile: completeProfile,
    });

    expect(readiness.canSubmit).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.warnings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "course_cover_missing",
        "course_subtitle_missing",
        "course_description_missing",
        "course_unusually_short",
      ]),
    );
  });

  it("warns but does not block when a paid course has no preview lesson", () => {
    const readiness = evaluateCourseReadiness({
      course: createCourse({ priceHalalas: 25_000 }),
      instructorProfile: completeProfile,
    });

    expect(readiness.canSubmit).toBe(true);
    expect(readiness.warnings.map(({ code }) => code)).toContain(
      "paid_course_preview_missing",
    );
  });

  it("keeps optional instructor information non-blocking", () => {
    const readiness = evaluateCourseReadiness({
      course: createCourse(),
      instructorProfile: {
        ...completeProfile,
        avatarUrl: null,
        headline: null,
        bio: null,
      },
    });

    expect(readiness.canSubmit).toBe(true);
    expect(readiness.warnings.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "instructor_avatar_missing",
        "instructor_headline_missing",
        "instructor_bio_missing",
      ]),
    );
  });

  it("blocks invalid core course identity data", () => {
    const readiness = evaluateCourseReadiness({
      course: createCourse({ slug: "Invalid Slug", title: " ", priceHalalas: -1 }),
      instructorProfile: completeProfile,
    });

    expect(readiness.canSubmit).toBe(false);
    expect(readiness.blockers.map(({ code }) => code)).toContain(
      "course_identity_invalid",
    );
  });
});
