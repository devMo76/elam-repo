import { describe, expect, it } from "vitest";

import {
  courseCardCode,
  formatArabicDuration,
  formatArabicLessonCount,
} from "./presentation";
import { formatArabicMinutes } from "@/lib/format";

describe("catalogue presentation", () => {
  it("removes only the EE prefix from a card identity", () => {
    expect(courseCardCode("EE 301", "الهندسة الكهربائية")).toBe("301");
    expect(courseCardCode("CS 101", "علوم الحاسب")).toBe("CS 101");
  });

  it("uses Arabic lesson-count forms", () => {
    expect(formatArabicLessonCount(1)).toBe("درس واحد");
    expect(formatArabicLessonCount(2)).toBe("درسين");
    expect(formatArabicLessonCount(6)).toBe("6 دروس");
    expect(formatArabicLessonCount(18)).toBe("18 درسًا");
  });

  it("uses Arabic duration forms", () => {
    expect(formatArabicDuration(60)).toBe("دقيقة واحدة");
    expect(formatArabicDuration(120)).toBe("دقيقتان");
    expect(formatArabicDuration(600)).toBe("10 دقائق");
    expect(formatArabicDuration(720)).toBe("12 دقيقة");
    expect(formatArabicDuration(4_320)).toBe("ساعة واحدة و12 دقيقة");
    expect(formatArabicMinutes(10)).toBe("10 دقائق");
    expect(formatArabicMinutes(12)).toBe("12 دقيقة");
    expect(formatArabicMinutes(1)).toBe("دقيقة واحدة");
    expect(formatArabicMinutes(2)).toBe("دقيقتان");
    expect(formatArabicMinutes(0)).toBe("أقل من دقيقة");
  });
});
