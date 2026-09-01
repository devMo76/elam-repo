import "server-only";

import { directVideoUploadResponseSchema } from "@/lib/contracts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createBunnyUploadAuthorization,
  createBunnyVideo,
  deleteBunnyVideo,
} from "@/lib/video/bunny";

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
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new VideoUploadRequestError(
      401,
      "unauthenticated",
      "Sign-in is required.",
    );
  }

  const [profileResult, lessonResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("lessons")
      .select("id, title, module_id, media_status")
      .eq("id", lessonId)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new VideoUploadRequestError(
      403,
      "forbidden",
      "An instructor or administrator role is required.",
    );
  }

  if (lessonResult.error) {
    throw new VideoUploadRequestError(
      500,
      "lesson_lookup_failed",
      "The lesson could not be checked.",
    );
  }

  if (!lessonResult.data) {
    throw new VideoUploadRequestError(
      404,
      "lesson_not_found",
      "The lesson was not found.",
    );
  }

  const lesson = lessonResult.data;
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .maybeSingle();

  if (moduleError || !module) {
    throw new VideoUploadRequestError(
      404,
      "lesson_not_found",
      "The lesson was not found.",
    );
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("instructor_id")
    .eq("id", module.course_id)
    .maybeSingle();

  if (courseError || !course) {
    throw new VideoUploadRequestError(
      404,
      "lesson_not_found",
      "The lesson was not found.",
    );
  }

  const isAdmin = profileResult.data.role === "admin";
  const isOwner = course.instructor_id === user.id;

  if (!isAdmin && !isOwner) {
    throw new VideoUploadRequestError(
      403,
      "forbidden",
      "You cannot upload video for this lesson.",
    );
  }

  if (
    lesson.media_status === "uploading" ||
    lesson.media_status === "processing"
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
