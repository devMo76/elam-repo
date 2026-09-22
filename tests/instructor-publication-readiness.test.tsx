import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  arabicBlockerCount,
  PublicationReadinessPanel,
  publicationError,
} from "@/components/instructor/InstructorPublicationActions";
import type { CourseReadiness } from "@/lib/contracts";

function render(readiness: CourseReadiness, options?: { checking?: boolean; forceOpen?: boolean }) {
  return renderToStaticMarkup(<PublicationReadinessPanel readiness={readiness} {...options} />);
}

describe("PublicationReadinessPanel", () => {
  it("shows a concise ready state", () => {
    expect(render({ canSubmit: true, blockers: [], warnings: [] })).toContain("المقرر جاهز للإرسال");
  });

  it("shows blocker count and actionable target", () => {
    const html = render({
      canSubmit: false,
      blockers: [{ code: "lesson_media_not_ready", message: "not ready", target: "media", entityId: "9dc5931c-98cd-4026-a4dc-7d15fca04cb5" }],
      warnings: [],
    });
    expect(html).toContain("متطلب واحد متبقٍ");
    expect(html).toContain('href="#lesson-9dc5931c-98cd-4026-a4dc-7d15fca04cb5"');
  });

  it("distinguishes optional warnings without blocking submission", () => {
    const html = render({
      canSubmit: true,
      blockers: [],
      warnings: [{ code: "course_cover_missing", message: "missing", target: "details" }],
    });
    expect(html).toContain("تحسينات اختيارية");
    expect(html).toContain('href="#course-details"');
  });

  it("announces the checking state", () => {
    expect(render({ canSubmit: true, blockers: [], warnings: [] }, { checking: true })).toContain("جارٍ التحقق من جاهزية المقرر");
  });

  it("opens server blockers and gives a recoverable server error", () => {
    const html = render({
      canSubmit: false,
      blockers: [{ code: "course_module_required", message: "missing", target: "curriculum" }],
      warnings: [],
    }, { forceOpen: true });
    expect(html).toContain("open");
    expect(publicationError({ error: { code: "course_not_ready" } })).toContain("أكمل المتطلبات");
  });
});

describe("arabicBlockerCount", () => {
  it.each([
    [1, "متطلب واحد متبقٍ"],
    [2, "متطلبان متبقيان"],
    [4, "٤ متطلبات متبقية"],
    [12, "١٢ متطلبًا متبقيًا"],
  ])("formats %i using Arabic grammar", (count, expected) => {
    expect(arabicBlockerCount(count)).toBe(expected);
  });
});
