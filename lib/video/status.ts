import "server-only";

import { lessonVideoStatusResponseSchema } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBunnyVideo } from "@/lib/video/bunny";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";
import { mapBunnyStatus } from "@/lib/video/webhook";

export class VideoStatusRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VideoStatusRequestError";
  }
}

export async function getLessonVideoStatus(lessonId: string) {
  const access = await getManagedVideoLesson(lessonId);

  if (!access.success) {
    throw new VideoStatusRequestError(
      access.status,
      access.code,
      access.message,
    );
  }

  const { lesson } = access;

  if (lesson.mediaStatus === "absent" || lesson.mediaStatus === "failed") {
    return lessonVideoStatusResponseSchema.parse({
      data: {
        mediaStatus: lesson.mediaStatus,
        encodingProgress: null,
      },
    });
  }

  if (lesson.mediaStatus === "ready") {
    return lessonVideoStatusResponseSchema.parse({
      data: {
        mediaStatus: lesson.mediaStatus,
        encodingProgress: 100,
      },
    });
  }

  if (!lesson.videoAssetId) {
    throw new VideoStatusRequestError(
      500,
      "invalid_video_state",
      "The lesson video state is inconsistent.",
    );
  }

  let video;

  try {
    video = await getBunnyVideo(lesson.videoAssetId);
  } catch {
    throw new VideoStatusRequestError(
      502,
      "video_provider_unavailable",
      "The current video processing progress could not be loaded.",
    );
  }

  const providerStatus = mapBunnyStatus(video.status);
  const mediaStatus = providerStatus ?? lesson.mediaStatus;

  // A public Bunny webhook is the fast path in production. During local
  // development it cannot reach localhost, so the authenticated status poll
  // also mirrors a provider state change into the lesson record.
  if (providerStatus && providerStatus !== lesson.mediaStatus) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("lessons")
      .update({
        media_status: providerStatus,
        duration_seconds: providerStatus === "ready" ? video.length : null,
      })
      .eq("id", lesson.id)
      .eq("video_asset_id", lesson.videoAssetId);

    if (error) {
      throw new VideoStatusRequestError(
        500,
        "video_status_update_failed",
        "The video processing status could not be saved.",
      );
    }
  }

  return lessonVideoStatusResponseSchema.parse({
    data: {
      mediaStatus,
      encodingProgress: mediaStatus === "failed" ? null : video.encodeProgress,
    },
  });
}
