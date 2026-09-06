import { getAdminRevenueByCourse } from "@/lib/admin/reporting";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminRevenueQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) return authorization.response;

  const query = adminRevenueQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!query.success) {
    return createApiError(422, "invalid_admin_revenue_filters", "The revenue filters are invalid.");
  }

  try {
    const response = await getAdminRevenueByCourse(authorization.supabase, query.data);
    return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return createApiError(500, "admin_revenue_failed", "The revenue report could not be loaded.");
  }
}
