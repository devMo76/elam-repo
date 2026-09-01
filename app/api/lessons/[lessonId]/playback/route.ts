import { z } from "zod";

import { lessonPlaybackResponseSchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";
import { createBunnyPlaybackCredential } from "@/lib/video/bunny";

export const runtime = "nodejs";

type PlaybackRouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function GET(
  _request: Request,
  { params }: PlaybackRouteContext,
) {
  const lessonId = z.uuid().safeParse((await params).lessonId);

  if (!lessonId.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  const supabase = await createClient();
  const { data: accessRows, error: accessError } = await supabase.rpc(
    "get_lesson_playback_access",
    { target_lesson: lessonId.data },
  );

  if (accessError) {
    return createApiError(
      500,
      "playback_access_failed",
      "Playback access could not be checked.",
    );
  }

  const access = accessRows[0];

  if (!access) {
    return createApiError(
      403,
      "playback_forbidden",
      "You do not have access to this lesson.",
    );
  }

  if (
    access.media_status !== "ready" ||
    !access.video_asset_id ||
    access.duration_seconds === null
  ) {
    return createApiError(
      409,
      "video_not_ready",
      "The lesson video is not ready for playback.",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let progress = null;

  if (user) {
    const { data, error } = await supabase
      .from("lesson_progress")
      .select("last_position_seconds, completed_at, revision")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId.data)
      .maybeSingle();

    if (error) {
      return createApiError(
        500,
        "progress_lookup_failed",
        "Saved lesson progress could not be loaded.",
      );
    }

    if (data) {
      progress = {
        positionSeconds: data.last_position_seconds,
        completedAt: data.completed_at,
        revision: data.revision,
      };
    }
  }

  const response = lessonPlaybackResponseSchema.parse({
    data: {
      ...createBunnyPlaybackCredential(access.video_asset_id),
      progress,
    },
  });

  return Response.json(response, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
