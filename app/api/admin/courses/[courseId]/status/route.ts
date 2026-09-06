import { z } from "zod";

import { AdminCourseError, changeAdminCourseStatus } from "@/lib/admin/courses";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminCourseStatusActionSchema } from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  const courseId = z.uuid().safeParse((await params).courseId);
  if (!courseId.success) return createApiError(404, "course_not_found", "The course was not found.");

  const body = await parseJsonBody(request, adminCourseStatusActionSchema);
  if (!body.success) return body.response;

  try {
    const response = await changeAdminCourseStatus(authorization.supabase, courseId.data, body.data.status);
    return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AdminCourseError) return createApiError(error.status, error.code, error.message);
    return createApiError(500, "admin_course_update_failed", "The course status could not be changed.");
  }
}
