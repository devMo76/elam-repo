import "server-only";

import { directVideoUploadResponseSchema } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createBunnyUploadAuthorization,
  createBunnyVideo,
  deleteBunnyVideo,
} from "@/lib/video/bunny";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";

export class VideoUploadRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VideoUploadRequestError";
  }
}

async function removeUnclaimedVideo(videoId: string) {
  try {
    await deleteBunnyVideo(videoId);
  } catch {
    // The upload remains unusable because it was never bound to a lesson.
    console.error("Failed to remove an unclaimed Bunny video.", { videoId });
  }
}

export async function requestLessonVideoUpload(lessonId: string) {
  const access = await getManagedVideoLesson(lessonId);

  if (!access.success) {
    throw new VideoUploadRequestError(
      access.status,
      access.code,
      access.message,
    );
  }

  const { lesson } = access;

  if (
    lesson.mediaStatus === "uploading" ||
    lesson.mediaStatus === "processing"
  ) {
    throw new VideoUploadRequestError(
      409,
      "video_upload_in_progress",
      "A video upload is already active for this lesson.",
    );
  }

  let video;

  try {
    video = await createBunnyVideo(`lesson:${lesson.id}:${lesson.title}`);
  } catch {
    throw new VideoUploadRequestError(
      502,
      "video_provider_unavailable",
      "The video provider could not create the upload.",
    );
  }

  const admin = createAdminClient();
  const { data: claimedLesson, error: claimError } = await admin
    .from("lessons")
    .update({
      video_asset_id: video.guid,
      duration_seconds: null,
      media_status: "uploading",
    })
    .eq("id", lesson.id)
    .not("media_status", "in", "(uploading,processing)")
    .select("id")
    .maybeSingle();

  if (claimError || !claimedLesson) {
    await removeUnclaimedVideo(video.guid);

    throw new VideoUploadRequestError(
      claimError ? 500 : 409,
      claimError ? "video_binding_failed" : "video_upload_in_progress",
      claimError
        ? "The video could not be attached to the lesson."
        : "Another upload has already started.",
    );
  }

  return directVideoUploadResponseSchema.parse({
    data: {
      videoId: video.guid,
      upload: createBunnyUploadAuthorization(video.guid),
    },
  });
}
