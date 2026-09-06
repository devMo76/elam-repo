import { describe, expect, it } from "vitest";

import {
  createAuthoringCourseRequestSchema,
  reorderModulesRequestSchema,
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
});
