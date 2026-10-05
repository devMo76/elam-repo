export const MAX_LESSON_PDF_BYTES = 20 * 1024 * 1024;

export async function parseLessonPdf(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 5 || file.size > MAX_LESSON_PDF_BYTES || file.type !== "application/pdf") {
    return null;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return null;
  return {
    bytes,
    byteSize: file.size,
    fileName: file.name.replace(/[\\/\x00-\x1f]/g, "").trim().slice(0, 180) || "lesson.pdf",
  };
}
