import { describe, expect, it } from "vitest";

import { createCourseSlugBase, createCourseSlugCandidate } from "./slug";

describe("course slug generation", () => {
  it("transliterates Arabic titles into safe stable URL segments", () => {
    expect(createCourseSlugBase("الإشارات والأنظمة ٢")).toBe(
      "alasharat-walanzmh-2",
    );
  });

  it("normalizes Latin titles, punctuation, and repeated separators", () => {
    expect(createCourseSlugBase("Signals & Systems: EE 301")).toBe(
      "signals-systems-ee-301",
    );
  });

  it("falls back safely and appends bounded duplicate suffixes", () => {
    expect(createCourseSlugBase("⚡️")).toBe("course");
    expect(createCourseSlugCandidate("signals-and-systems", 1)).toBe(
      "signals-and-systems-2",
    );
    expect(createCourseSlugCandidate("a".repeat(120), 19)).toHaveLength(120);
  });
});
