import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CourseLabel } from "@/components/ui/CourseLabel";

describe("course identity typography", () => {
  it.each(["الهندسة الكهربائية", "إشارات وأنظمة", "EE 301 — الهندسة الكهربائية"])("uses the Arabic site font for %s", (label) => {
    const html = renderToStaticMarkup(<CourseLabel className="text-4xl">{label}</CourseLabel>);
    expect(html).toContain('dir="auto"');
    expect(html).toContain("font-sans text-4xl");
    expect(html).not.toContain("font-mono");
  });

  it.each(["EE 301", "301", "CS 101"])("preserves isolated monospace codes for %s", (label) => {
    const html = renderToStaticMarkup(<CourseLabel>{label}</CourseLabel>);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("font-mono tabular-nums");
  });
});
