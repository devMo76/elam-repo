import { z } from "zod";

import { createApiError } from "@/lib/http/api-response";
import { parseLessonPdf } from "@/lib/pdf-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";

export const runtime = "nodejs";
const bucket = "lesson-pdfs";
type Context = { params: Promise<{ lessonId: string }> };

async function editableLesson(context: Context) {
  const parsed = z.uuid().safeParse((await context.params).lessonId);
  if (!parsed.success) return { error: createApiError(404, "lesson_not_found", "Lesson not found.") };
  const access = await getManagedVideoLesson(parsed.data);
  if (!access.success) return { error: createApiError(access.status, access.code, access.message) };

  const admin = createAdminClient();
  const { data: lesson, error } = await admin.from("lessons")
    .select("module:modules!inner(course:courses!inner(status))")
    .eq("id", parsed.data).single();
  if (error || !lesson) return { error: createApiError(404, "lesson_not_found", "Lesson not found.") };
  if (lesson.module.course.status !== "draft") {
    return { error: createApiError(409, "course_not_editable", "PDFs can only be edited in a draft course.") };
  }
  return { lessonId: parsed.data, admin };
}

export async function GET(_request: Request, context: Context) {
  const access = await editableLesson(context);
  if (access.error) return access.error;
  const { data, error } = await access.admin!.from("lesson_resources")
    .select("file_name, byte_size").eq("lesson_id", access.lessonId!).maybeSingle();
  if (error) return createApiError(500, "pdf_lookup_failed", "Could not load the PDF.");
  return Response.json({ data: data ? { fileName: data.file_name, byteSize: data.byte_size } : null },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, context: Context) {
  const access = await editableLesson(context);
  if (access.error) return access.error;
  const path = `${access.lessonId}/${crypto.randomUUID()}.pdf`;
  const admin = access.admin!;
  const signed = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    return createApiError(502, "pdf_upload_failed", "The PDF upload could not be prepared.");
  }
  return Response.json({ data: { path, token: signed.data.token } }, { status: 201,
    headers: { "Cache-Control": "private, no-store" } });
}

const finalizeSchema = z.strictObject({
  path: z.string(),
  fileName: z.string().min(1).max(255),
  byteSize: z.number().int().min(5).max(20 * 1024 * 1024),
});

export async function PATCH(request: Request, context: Context) {
  const access = await editableLesson(context);
  if (access.error) return access.error;
  const parsed = finalizeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !new RegExp(`^${access.lessonId}/[0-9a-f-]{36}\\.pdf$`).test(parsed.data.path)) {
    return createApiError(400, "invalid_pdf", "Invalid PDF upload.");
  }
  const { path, fileName, byteSize } = parsed.data;
  const admin = access.admin!;
  const downloaded = await admin.storage.from(bucket).download(path);
  if (downloaded.error || !downloaded.data) {
    return createApiError(404, "pdf_upload_not_found", "The PDF upload was not found.");
  }
  const parsedPdf = await parseLessonPdf(new File([downloaded.data], fileName, { type: "application/pdf" }));
  if (!parsedPdf || parsedPdf.byteSize !== byteSize) {
    await admin.storage.from(bucket).remove([path]);
    return createApiError(400, "invalid_pdf", "The uploaded file is not a valid PDF.");
  }
  const { data: previous } = await admin.from("lesson_resources")
    .select("storage_path").eq("lesson_id", access.lessonId!).maybeSingle();
  const saved = await admin.from("lesson_resources").upsert({
    lesson_id: access.lessonId!, storage_path: path, file_name: parsedPdf.fileName, byte_size: byteSize,
    updated_at: new Date().toISOString(),
  });
  if (saved.error) {
    await admin.storage.from(bucket).remove([path]);
    return createApiError(500, "pdf_save_failed", "The PDF could not be saved.");
  }
  if (previous?.storage_path) await admin.storage.from(bucket).remove([previous.storage_path]);
  return Response.json({ data: { fileName: parsedPdf.fileName, byteSize } });
}

export async function DELETE(_request: Request, context: Context) {
  const access = await editableLesson(context);
  if (access.error) return access.error;
  const admin = access.admin!;
  const { data: previous } = await admin.from("lesson_resources")
    .select("storage_path").eq("lesson_id", access.lessonId!).maybeSingle();
  if (!previous) return new Response(null, { status: 204 });
  const removed = await admin.from("lesson_resources").delete().eq("lesson_id", access.lessonId!);
  if (removed.error) return createApiError(500, "pdf_delete_failed", "The PDF could not be removed.");
  await admin.storage.from(bucket).remove([previous.storage_path]);
  return new Response(null, { status: 204 });
}
