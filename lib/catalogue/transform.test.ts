import { describe, expect, it } from "vitest";

import {
  parseRawCatalogueCourse,
  parseRawCatalogueCourseSummary,
  toCatalogueCourseDetail,
  toCatalogueCourseSummary,
} from "@/lib/catalogue/transform";
import { rawPublishedCourseFixture } from "@/tests/fixtures/catalogue.fixture";

describe("catalogue database transformations", () => {
  it("maps snake-case database data into the stable frontend contract", () => {
    const course = toCatalogueCourseDetail(
      parseRawCatalogueCourse(rawPublishedCourseFixture),
      true,
    );

    expect(course).toMatchObject({
      courseCode: "EE301",
      durationSeconds: 1800,
      lessonCount: 3,
      isEnrolled: true,
      visibility: "public",
    });
    expect(course.modules.map((module) => module.position)).toEqual([1, 2]);
    expect(course.modules[0].lessons.map((lesson) => lesson.position)).toEqual([
      1, 2,
    ]);
  });

  it("marks authorized unpublished records as previews", () => {
    const course = toCatalogueCourseDetail(
      parseRawCatalogueCourse({
        ...rawPublishedCourseFixture,
        status: "draft",
      }),
      false,
    );

    expect(course.visibility).toBe("preview");
  });

  it("returns a compact summary without syllabus or database-only fields", () => {
    const rawSummary = parseRawCatalogueCourseSummary({
      id: rawPublishedCourseFixture.id,
      slug: rawPublishedCourseFixture.slug,
      department: rawPublishedCourseFixture.department,
      course_code: rawPublishedCourseFixture.course_code,
      title: rawPublishedCourseFixture.title,
      subtitle: rawPublishedCourseFixture.subtitle,
      price_halalas: rawPublishedCourseFixture.price_halalas,
      currency: rawPublishedCourseFixture.currency,
      cover_url: rawPublishedCourseFixture.cover_url,
      instructor: rawPublishedCourseFixture.instructor,
      modules: rawPublishedCourseFixture.modules.map((module) => ({
        lessons: module.lessons.map((lesson) => ({
          duration_seconds: lesson.duration_seconds,
        })),
      })),
    });
    const course = toCatalogueCourseSummary(
      rawSummary,
      false,
    );

    expect(course).not.toHaveProperty("modules");
    expect(course).not.toHaveProperty("status");
    expect(course).not.toHaveProperty("instructorId");
    expect(course.instructor).not.toHaveProperty("role");
  });
});
