import { z } from "zod";
import { requireInstructorAuthoringContext } from "@/lib/authoring/access";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { throwAuthoringDatabaseError } from "@/lib/authoring/errors";
import { createApiError } from "@/lib/http/api-response";

export async function POST(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const id = z.uuid().safeParse((await params).courseId);
  if (!id.success) return createApiError(404, "course_not_found", "Course not found.");
  try {
    const { supabase } = await requireInstructorAuthoringContext();
    const { data, error } = await supabase.rpc("release_course_additions", { target_course_id: id.data });
    if (error?.code === "23514") return createApiError(409, "additions_not_ready", "All added lessons must be ready before release.");
    if (error) throwAuthoringDatabaseError(error, "Additions could not be released.");
    if (typeof data !== "number" || !Number.isInteger(data) || data < 0) return createApiError(500, "release_failed", "Additions could not be released.");
    return Response.json({ data: { releasedLessonCount: data } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return createAuthoringErrorResponse(error, "release_failed");
  }
}
