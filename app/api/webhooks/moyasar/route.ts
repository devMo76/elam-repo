import {
  getMoyasarApiEnvironment,
  getMoyasarWebhookEnvironment,
} from "@/lib/env/server";
import { createApiError } from "@/lib/http/api-response";
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

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: Request) {
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

  try {
    await confirmMoyasarPayment(webhook.data.data.id, {
      kind: "webhook",
      eventId: webhook.data.id,
      eventType: webhook.data.type,
    });
  } catch (error) {
    if (error instanceof PaymentConfirmationError) {
      return createApiError(error.status, error.code, error.message);
    }

    return createApiError(
      500,
      "payment_confirmation_failed",
      "The payment could not be confirmed.",
    );
  }

  return new Response(null, { status: 204 });
}
