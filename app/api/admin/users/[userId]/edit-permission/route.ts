import { z } from "zod";
import { AdminCourseError } from "@/lib/admin/courses";
import { changeInstructorUpdatePermission } from "@/lib/admin/instructor-permissions";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminCourseEditPermissionActionSchema } from "@/lib/contracts/admin";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  const id = z.uuid().safeParse((await params).userId);
  if (!id.success) return createApiError(404, "instructor_not_found", "The instructor was not found.");
  const body = await parseJsonBody(request, adminCourseEditPermissionActionSchema);
  if (!body.success) return body.response;
  try {
    const result = await changeInstructorUpdatePermission(authorization.supabase, id.data, body.data.publishedEditsAllowed);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AdminCourseError) return createApiError(error.status, error.code, error.message);
    return createApiError(500, "admin_instructor_permission_failed", "The instructor permission could not be changed.");
  }
}
