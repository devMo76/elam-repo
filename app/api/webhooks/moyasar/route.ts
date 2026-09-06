import {
  getMoyasarApiEnvironment,
  getMoyasarWebhookEnvironment,
} from "@/lib/env/server";
import { createApiError } from "@/lib/http/api-response";
import { getRequestId, logger } from "@/lib/observability/logger";
import {
  confirmMoyasarPayment,
  PaymentConfirmationError,
} from "@/lib/payments/confirmation";
import {
  isExpectedMoyasarMode,
  moyasarWebhookAuthSchema,
  moyasarWebhookSchema,
  verifyMoyasarWebhookSecret,
} from "@/lib/payments/moyasar";
import {
  beginWebhookDelivery,
  finishWebhookDelivery,
} from "@/lib/webhooks/delivery";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return createApiError(
      413,
      "webhook_payload_too_large",
      "The payment webhook payload is too large.",
    );
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  if (rawBody.byteLength > MAX_WEBHOOK_BYTES) {
    return createApiError(
      413,
      "webhook_payload_too_large",
      "The payment webhook payload is too large.",
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return createApiError(
      400,
      "invalid_webhook_payload",
      "The payment webhook payload is invalid.",
    );
  }

  const authentication = moyasarWebhookAuthSchema.safeParse(parsedJson);

  if (!authentication.success) {
    return createApiError(
      401,
      "invalid_webhook_secret",
      "The payment webhook secret is invalid.",
    );
  }

  const webhookEnvironment = getMoyasarWebhookEnvironment();

  if (
    !verifyMoyasarWebhookSecret(
      authentication.data.secret_token,
      webhookEnvironment.MOYASAR_WEBHOOK_SECRET,
    )
  ) {
    return createApiError(
      401,
      "invalid_webhook_secret",
      "The payment webhook secret is invalid.",
    );
  }

  const webhook = moyasarWebhookSchema.safeParse(parsedJson);

  if (!webhook.success) {
    return createApiError(
      400,
      "invalid_webhook_payload",
      "The payment webhook payload is invalid.",
    );
  }

  const apiEnvironment = getMoyasarApiEnvironment();

  if (
    !isExpectedMoyasarMode(
      webhook.data.live,
      apiEnvironment.MOYASAR_SECRET_KEY,
    )
  ) {
    return createApiError(
      400,
      "unexpected_payment_mode",
      "The payment webhook belongs to another environment.",
    );
  }

  let delivery;
  try {
    delivery = await beginWebhookDelivery({
      provider: "moyasar",
      eventKey: webhook.data.id,
      eventType: webhook.data.type,
      resourceId: webhook.data.data.id,
      requestId,
    });
  } catch (error) {
    logger.error("moyasar.webhook.tracking_failed", { requestId, error });
    return createApiError(503, "webhook_tracking_unavailable", "The webhook could not be recorded.");
  }

  try {
    await confirmMoyasarPayment(webhook.data.data.id, {
      kind: "webhook",
      eventId: webhook.data.id,
      eventType: webhook.data.type,
    });
  } catch (error) {
    if (error instanceof PaymentConfirmationError) {
      await finishWebhookDelivery(delivery.id, "failed", error.code).catch(() => undefined);
      logger.warn("moyasar.webhook.rejected", {
        requestId,
        eventId: webhook.data.id,
        paymentId: webhook.data.data.id,
        errorCode: error.code,
      });
      return createApiError(error.status, error.code, error.message);
    }

    await finishWebhookDelivery(delivery.id, "failed", "payment_confirmation_failed").catch(() => undefined);
    logger.error("moyasar.webhook.failed", {
      requestId,
      eventId: webhook.data.id,
      paymentId: webhook.data.data.id,
      error,
    });

    return createApiError(
      500,
      "payment_confirmation_failed",
      "The payment could not be confirmed.",
    );
  }

  try {
    await finishWebhookDelivery(delivery.id, "completed");
  } catch (error) {
    logger.error("moyasar.webhook.tracking_failed", { requestId, error });
    return createApiError(503, "webhook_tracking_unavailable", "The webhook result could not be recorded.");
  }

  logger.info("moyasar.webhook.completed", {
    requestId,
    eventId: webhook.data.id,
    paymentId: webhook.data.data.id,
    eventType: webhook.data.type,
    attemptCount: delivery.attemptCount,
  });

  return new Response(null, { status: 204 });
}
