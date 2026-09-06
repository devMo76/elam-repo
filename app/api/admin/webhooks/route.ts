import { getAdminWebhookDeliveries } from "@/lib/admin/webhooks";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminWebhookListQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;

  const query = adminWebhookListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) {
    return createApiError(422, "invalid_webhook_filters", "The webhook filters are invalid.");
  }

  try {
    return Response.json(
      await getAdminWebhookDeliveries(authorization.supabase, query.data),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return createApiError(500, "webhook_history_failed", "Webhook history could not be loaded.");
  }
}
