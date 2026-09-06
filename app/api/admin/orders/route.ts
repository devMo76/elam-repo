import { getAdminPurchaseHistory } from "@/lib/admin/reporting";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminPurchaseHistoryQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) return authorization.response;

  const query = adminPurchaseHistoryQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );

  if (!query.success) {
    return createApiError(422, "invalid_admin_order_filters", "The purchase filters are invalid.");
  }

  try {
    const response = await getAdminPurchaseHistory(authorization.supabase, query.data);
    return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return createApiError(500, "admin_orders_failed", "Purchase history could not be loaded.");
  }
}
