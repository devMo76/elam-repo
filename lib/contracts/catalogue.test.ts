import { describe, expect, it } from "vitest";

import {
  catalogueCourseDetailSchema,
  courseSlugSchema,
} from "@/lib/contracts/catalogue";
import { catalogueCourseDetailFixture } from "@/tests/fixtures/catalogue.fixture";

describe("catalogue contracts", () => {
  it("accepts the frontend course-detail fixture", () => {
    expect(
      catalogueCourseDetailSchema.safeParse(catalogueCourseDetailFixture)
        .success,
    ).toBe(true);
  });

  it("accepts normalized slugs and rejects unsafe route values", () => {
    expect(courseSlugSchema.safeParse("signals-and-systems-ee301").success).toBe(
      true,
    );
    expect(courseSlugSchema.safeParse("Signals and Systems").success).toBe(
      false,
    );
    expect(courseSlugSchema.safeParse("../admin").success).toBe(false);
  });

  it("rejects privileged or media fields at every public boundary", () => {
    expect(
      catalogueCourseDetailSchema.safeParse({
        ...catalogueCourseDetailFixture,
        status: "published",
      }).success,
    ).toBe(false);

    expect(
      catalogueCourseDetailSchema.safeParse({
        ...catalogueCourseDetailFixture,
        modules: [
          {
            ...catalogueCourseDetailFixture.modules[0],
            lessons: [
              {
                ...catalogueCourseDetailFixture.modules[0].lessons[0],
                videoAssetId: "must-never-cross-the-contract",
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      catalogueCourseDetailSchema.safeParse({
        ...catalogueCourseDetailFixture,
        instructor: {
          ...catalogueCourseDetailFixture.instructor,
          role: "instructor",
        },
      }).success,
    ).toBe(false);
  });
});
