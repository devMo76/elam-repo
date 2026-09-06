import { getAdminDashboardSummary } from "@/lib/admin/reporting";
import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET() {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return authorization.response;
  }

  try {
    const response = await getAdminDashboardSummary(authorization.supabase);

    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return createApiError(
      500,
      "admin_summary_failed",
      "The administration summary could not be loaded.",
    );
  }
}
