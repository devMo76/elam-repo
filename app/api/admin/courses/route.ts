import { getAdminCourses } from "@/lib/admin/courses";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminCourseListQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  const query = adminCourseListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return createApiError(422, "invalid_admin_course_filters", "The course filters are invalid.");

  try {
    const response = await getAdminCourses(authorization.supabase, query.data);
    return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return createApiError(500, "admin_courses_failed", "Courses could not be loaded.");
  }
}
