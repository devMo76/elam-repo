import "server-only";

import { lessonVideoStatusResponseSchema } from "@/lib/contracts";
import { getBunnyVideo } from "@/lib/video/bunny";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";

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

  return lessonVideoStatusResponseSchema.parse({
    data: {
      mediaStatus: lesson.mediaStatus,
      encodingProgress: video.encodeProgress,
    },
  });
}
