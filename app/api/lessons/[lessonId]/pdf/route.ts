import { z } from "zod";

import { createApiError } from "@/lib/http/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ lessonId: string }> };

export async function GET(request: Request, { params }: Context) {
  const lessonId = z.uuid().safeParse((await params).lessonId);
  if (!lessonId.success) return createApiError(404, "lesson_not_found", "Lesson not found.");

  const supabase = await createClient();
  const access = await supabase.rpc("get_lesson_playback_access", { target_lesson: lessonId.data });
  if (access.error) return createApiError(500, "pdf_access_failed", "Could not check lesson access.");
  if (!access.data?.length) return createApiError(403, "pdf_forbidden", "This PDF is not available to your account.");

  const admin = createAdminClient();
  const { data: resource, error } = await admin.from("lesson_resources")
    .select("storage_path, file_name, byte_size").eq("lesson_id", lessonId.data).maybeSingle();
  if (error) return createApiError(500, "pdf_lookup_failed", "Could not load the PDF.");
  if (!resource) return createApiError(404, "pdf_not_found", "This lesson has no PDF.");

  if (new URL(request.url).searchParams.has("metadata")) {
    return Response.json({ data: { fileName: resource.file_name, byteSize: resource.byte_size } },
      { headers: { "Cache-Control": "private, no-store" } });
  }

  const signed = await admin.storage.from("lesson-pdfs")
    .createSignedUrl(resource.storage_path, 60);
  if (signed.error || !signed.data) return createApiError(502, "pdf_link_failed", "Could not open the PDF.");
  return new Response(null, { status: 302, headers: {
    Location: signed.data.signedUrl,
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  } });
}
