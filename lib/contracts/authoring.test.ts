import { describe, expect, it } from "vitest";

import {
  createAuthoringCourseRequestSchema,
  createLessonsRequestSchema,
  duplicateLessonRequestSchema,
  reorderModulesRequestSchema,
  updateInstructorProfileRequestSchema,
  updateLessonRequestSchema,
  updateAuthoringCourseRequestSchema,
} from "./authoring";

const validCourse = {
  slug: "power-electronics-ee402",
  department: "EE",
  courseCode: "EE402",
  title: "Power Electronics",
  subtitle: null,
  description: null,
  priceHalalas: 25000,
  coverUrl: null,
};

describe("authoring contracts", () => {
  it("accepts a valid server-authoritative draft course request", () => {
    expect(createAuthoringCourseRequestSchema.parse(validCourse)).toEqual(validCourse);
    const courseWithoutSlug = {
      department: validCourse.department,
      courseCode: validCourse.courseCode,
      title: validCourse.title,
      subtitle: validCourse.subtitle,
      description: validCourse.description,
      priceHalalas: validCourse.priceHalalas,
      coverUrl: validCourse.coverUrl,
    };
    expect(createAuthoringCourseRequestSchema.parse(courseWithoutSlug)).toEqual(
      courseWithoutSlug,
    );
  });

  it("rejects an invalid optional slug override", () => {
    expect(
      createAuthoringCourseRequestSchema.safeParse({
        ...validCourse,
        slug: "Unsafe Arabic رابط",
      }).success,
    ).toBe(false);
  });

  it("rejects protected and unexpected course fields", () => {
    expect(
      createAuthoringCourseRequestSchema.safeParse({
        ...validCourse,
        instructorId: "11111111-1111-4111-8111-111111111111",
        status: "published",
      }).success,
    ).toBe(false);
  });

  it("requires at least one field when updating a course", () => {
    expect(updateAuthoringCourseRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects duplicate module identifiers before database access", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(reorderModulesRequestSchema.safeParse({ moduleIds: [id, id] }).success).toBe(false);
  });

  it("allows lesson title and free-preview updates", () => {
    expect(
      updateLessonRequestSchema.parse({
        title: "Preview lesson",
        isFreePreview: true,
      }),
    ).toEqual({ title: "Preview lesson", isFreePreview: true });
  });

  it("accepts bounded quick-add and explicit duplicate actions", () => {
    expect(
      createLessonsRequestSchema.parse({ titles: ["الأول", "الثاني"] }),
    ).toEqual({ titles: ["الأول", "الثاني"] });
    expect(duplicateLessonRequestSchema.parse({ action: "duplicate" })).toEqual({
      action: "duplicate",
    });
    expect(
      createLessonsRequestSchema.safeParse({ titles: Array(51).fill("درس") }).success,
    ).toBe(false);
  });

  it("rejects provider-controlled video fields", () => {
    expect(
      updateLessonRequestSchema.safeParse({
        mediaStatus: "ready",
        videoAssetId: "forged",
      }).success,
    ).toBe(false);
  });

  it("allows only approved public instructor profile fields", () => {
    expect(
      updateInstructorProfileRequestSchema.parse({
        avatarUrl: "https://example.com/avatar.jpg",
        headline: "Electrical engineering instructor",
        bio: null,
      }),
    ).toEqual({
      avatarUrl: "https://example.com/avatar.jpg",
      headline: "Electrical engineering instructor",
      bio: null,
    });
    expect(
      updateInstructorProfileRequestSchema.safeParse({ role: "admin" }).success,
    ).toBe(false);
  });
});
