import { describe, expect, it } from "vitest";

import { MAX_LESSON_PDF_BYTES, parseLessonPdf } from "./pdf-upload";

describe("lesson PDF validation", () => {
  it("accepts a PDF and removes unsafe path/control characters from its name", async () => {
    const result = await parseLessonPdf(new File(["%PDF-1.7\n"], "../notes\u0000.pdf", { type: "application/pdf" }));
    expect(result?.fileName).toBe("..notes.pdf");
    expect(result?.byteSize).toBe(9);
  });

  it("rejects MIME spoofing and non-PDF content", async () => {
    expect(await parseLessonPdf(new File(["%PDF-1.7"], "notes.txt", { type: "text/plain" }))).toBeNull();
    expect(await parseLessonPdf(new File(["<html>"], "notes.pdf", { type: "application/pdf" }))).toBeNull();
  });

  it("rejects files over the 20 MB limit", async () => {
    const oversized = new File([new Uint8Array(MAX_LESSON_PDF_BYTES + 1)], "huge.pdf", { type: "application/pdf" });
    expect(await parseLessonPdf(oversized)).toBeNull();
  });
});
