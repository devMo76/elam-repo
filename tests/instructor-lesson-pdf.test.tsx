import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

import { InstructorLessonPdf } from "@/components/instructor/InstructorLessonPdf";

describe("instructor PDF upload entry point", () => {
  it("offers an enabled upload button before a file has been selected", () => {
    const html = renderToStaticMarkup(<InstructorLessonPdf lessonId="example" />);
    const button = html.match(/<button[^>]*>رفع الملف<\/button>/)?.[0];
    expect(button).toBeDefined();
    expect(button).not.toContain("disabled");
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-describedby="lesson-pdf-status-example"');
  });

  it("hides the native picker and preserves its PDF restriction and accessible label", () => {
    const html = renderToStaticMarkup(<InstructorLessonPdf lessonId="example" />);
    const input = html.match(/<input[^>]*>/)?.[0];
    expect(input).toContain('type="file"');
    expect(input).toContain('hidden=""');
    expect(input).toContain('accept="application/pdf,.pdf"');
    expect(input).toContain('aria-labelledby="lesson-pdf-label-example"');
    expect(html).toContain('aria-live="polite"');
  });
});
