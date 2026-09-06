import { bunnyWebhookSchema } from "@/lib/contracts";
import { getBunnyStreamEnvironment } from "@/lib/env/server";
import { createApiError } from "@/lib/http/api-response";
import { getRequestId, logger } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBunnyVideo } from "@/lib/video/bunny";
import {
  mapBunnyStatus,
  verifyBunnyWebhookSignature,
} from "@/lib/video/webhook";
import {
  beginWebhookDelivery,
  finishWebhookDelivery,
} from "@/lib/webhooks/delivery";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const environment = getBunnyStreamEnvironment();
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return createApiError(
      413,
      "webhook_payload_too_large",
      "The video webhook payload is too large.",
    );
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  if (rawBody.byteLength > MAX_WEBHOOK_BYTES) {
    return createApiError(
      413,
      "webhook_payload_too_large",
      "The video webhook payload is too large.",
    );
  }

  if (
    !verifyBunnyWebhookSignature(
      rawBody,
      request.headers,
      environment.BUNNY_STREAM_READ_ONLY_API_KEY,
    )
  ) {
    return createApiError(
      401,
      "invalid_webhook_signature",
      "The video webhook signature is invalid.",
    );
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return createApiError(
      400,
      "invalid_webhook_payload",
      "The video webhook payload is invalid.",
    );
  }

  const webhook = bunnyWebhookSchema.safeParse(parsedJson);

  if (!webhook.success) {
    logger.warn("bunny.webhook.invalid_payload", {
      requestId,
      issues: webhook.error.issues.map(({ code, path }) => ({ code, path })),
    });

    return createApiError(
      400,
      "invalid_webhook_payload",
      "The video webhook payload is invalid.",
    );
  }

  if (
    String(webhook.data.VideoLibraryId) !==
    environment.BUNNY_STREAM_LIBRARY_ID
  ) {
    return createApiError(
      400,
      "unexpected_video_library",
      "The video webhook belongs to another library.",
    );
  }

  let delivery;
  try {
    delivery = await beginWebhookDelivery({
      provider: "bunny",
      eventKey: `${webhook.data.VideoGuid}:${webhook.data.Status}`,
      eventType: `video_status_${webhook.data.Status}`,
      resourceId: webhook.data.VideoGuid,
      requestId,
    });
  } catch (error) {
    logger.error("bunny.webhook.tracking_failed", { requestId, error });
    return createApiError(
      503,
      "webhook_tracking_unavailable",
      "The webhook could not be recorded.",
    );
  }

  let video;

  try {
    // Bunny signatures authenticate the event but carry no replay timestamp.
    // Fetching current provider state makes delayed events safe.
    video = await getBunnyVideo(webhook.data.VideoGuid);
  } catch (error) {
    await finishWebhookDelivery(delivery.id, "failed", "video_provider_unavailable").catch(() => undefined);
    logger.error("bunny.webhook.provider_check_failed", {
      requestId,
      videoId: webhook.data.VideoGuid,
      error,
    });
    return createApiError(
      502,
      "video_provider_unavailable",
      "The current video status could not be verified.",
    );
  }

  if (
    String(video.videoLibraryId) !== environment.BUNNY_STREAM_LIBRARY_ID ||
    video.guid !== webhook.data.VideoGuid
  ) {
    await finishWebhookDelivery(
      delivery.id,
      "failed",
      "video_identity_mismatch",
    ).catch(() => undefined);
    return createApiError(
      400,
      "video_identity_mismatch",
      "The video identity could not be verified.",
    );
  }

  const mediaStatus = mapBunnyStatus(video.status);

  if (!mediaStatus) {
    try {
      await finishWebhookDelivery(delivery.id, "completed");
    } catch (error) {
      logger.error("bunny.webhook.tracking_failed", { requestId, error });
      return createApiError(
        503,
        "webhook_tracking_unavailable",
        "The webhook result could not be recorded.",
      );
    }
    return new Response(null, { status: 204 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("lessons")
    .update({
      media_status: mediaStatus,
      duration_seconds: mediaStatus === "ready" ? video.length : null,
    })
    .eq("video_asset_id", video.guid);

  if (error) {
    await finishWebhookDelivery(delivery.id, "failed", "video_status_update_failed").catch(() => undefined);
    logger.error("bunny.webhook.database_update_failed", {
      requestId,
      videoId: video.guid,
      errorCode: error.code,
    });
    return createApiError(
      500,
      "video_status_update_failed",
      "The lesson video status could not be updated.",
    );
  }

  try {
    await finishWebhookDelivery(delivery.id, "completed");
  } catch (error) {
    logger.error("bunny.webhook.tracking_failed", { requestId, error });
    return createApiError(503, "webhook_tracking_unavailable", "The webhook result could not be recorded.");
  }

  logger.info("bunny.webhook.completed", {
    requestId,
    videoId: video.guid,
    mediaStatus,
    attemptCount: delivery.attemptCount,
  });

  return new Response(null, { status: 204 });
}
