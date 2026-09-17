import { describe, expect, it } from "vitest";

import {
  getCourseStructureSummary,
  instructorCourseStatusLabel,
} from "./presentation";

describe("instructor studio presentation", () => {
  it("summarizes the real curriculum without deriving financial or learner data", () => {
    const summary = getCourseStructureSummary({
      modules: [
        { lessons: [{ mediaStatus: "ready" }, { mediaStatus: "processing" }] },
        { lessons: [{ mediaStatus: "ready" }] },
      ],
    });

    expect(summary).toEqual({
      moduleCount: 2,
      lessonCount: 3,
      readyLessonCount: 2,
    });
    expect(JSON.stringify(summary)).not.toMatch(/revenue|amount|learner|userId/u);
  });

  it("uses the authoring status vocabulary exposed by the database contract", () => {
    expect(instructorCourseStatusLabel).toMatchObject({
      draft: "مسودة",
      in_review: "قيد المراجعة",
      published: "منشور",
      archived: "مؤرشف",
    });
  });
});
