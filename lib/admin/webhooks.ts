import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adminWebhookListResponseSchema,
  type AdminWebhookListQuery,
} from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";

export async function getAdminWebhookDeliveries(
  supabase: SupabaseClient<Database>,
  query: AdminWebhookListQuery,
) {
  let request = supabase
    .from("webhook_deliveries")
    .select("*", { count: "exact" })
    .order("last_received_at", { ascending: false })
    .range((query.page - 1) * query.pageSize, query.page * query.pageSize - 1);

  if (query.provider) request = request.eq("provider", query.provider);
  if (query.status) request = request.eq("status", query.status);

  const { data, error, count } = await request;
  if (error || !data) throw new Error("Webhook deliveries could not be loaded.");

  const totalCount = count ?? 0;
  return adminWebhookListResponseSchema.parse({
    data: data.map((delivery) => ({
      id: delivery.id,
      provider: delivery.provider,
      eventKey: delivery.event_key,
      eventType: delivery.event_type,
      resourceId: delivery.resource_id,
      status: delivery.status,
      attemptCount: delivery.attempt_count,
      requestId: delivery.request_id,
      lastErrorCode: delivery.last_error_code,
      firstReceivedAt: delivery.first_received_at,
      lastReceivedAt: delivery.last_received_at,
      completedAt: delivery.completed_at,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  });
}
