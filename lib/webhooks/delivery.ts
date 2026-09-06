import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

type Provider = Database["public"]["Enums"]["webhook_provider"];

export class WebhookDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookDeliveryError";
  }
}

export async function beginWebhookDelivery(input: {
  provider: Provider;
  eventKey: string;
  eventType: string;
  resourceId: string;
  requestId: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("begin_webhook_delivery", {
    target_provider: input.provider,
    target_event_key: input.eventKey,
    target_event_type: input.eventType,
    target_resource_id: input.resourceId,
    target_request_id: input.requestId,
  });
  const delivery = data?.[0];
  if (error || !delivery) throw new WebhookDeliveryError("Webhook attempt could not be recorded.");
  return { id: delivery.delivery_id, attemptCount: delivery.delivery_attempt_count };
}

export async function finishWebhookDelivery(
  id: number,
  status: "completed" | "failed",
  errorCode?: string,
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("finish_webhook_delivery", {
    target_delivery_id: id,
    target_status: status,
    target_error_code: errorCode,
  });
  if (error) throw new WebhookDeliveryError("Webhook result could not be recorded.");
}
