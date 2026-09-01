import { z } from "zod";

import {
  lessonProgressRequestSchema,
  lessonProgressResponseSchema,
} from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

type ProgressRouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function POST(
  request: Request,
  { params }: ProgressRouteContext,
) {
  const lessonId = z.uuid().safeParse((await params).lessonId);

  if (!lessonId.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  const body = await parseJsonBody(request, lessonProgressRequestSchema);

  if (!body.success) {
    return body.response;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return createApiError(401, "unauthenticated", "Sign-in is required.");
  }

  const { data, error } = await supabase.rpc("record_lesson_progress", {
    target_lesson: lessonId.data,
    target_position_seconds: body.data.positionSeconds,
    expected_revision: body.data.revision,
    mark_complete: body.data.markComplete,
  });

  if (error) {
    if (error.code === "40001") {
      return createApiError(
        409,
        "progress_conflict",
        "Newer progress already exists. Reload it and try again.",
      );
    }

    if (error.code === "42501") {
      return createApiError(
        403,
        "progress_forbidden",
        "You do not have access to this lesson.",
      );
    }

    if (error.code === "22023") {
      return createApiError(
        422,
        "invalid_progress",
        "The supplied playback position is invalid.",
      );
    }

    if (error.code === "55000") {
      return createApiError(
        409,
        "video_not_ready",
        "The lesson video is not ready.",
      );
    }

    return createApiError(
      500,
      "progress_update_failed",
      "Lesson progress could not be saved.",
    );
  }

  const saved = data[0];

  if (!saved) {
    return createApiError(
      500,
      "progress_update_failed",
      "Lesson progress could not be saved.",
    );
  }

  return Response.json(
    lessonProgressResponseSchema.parse({
      data: {
        positionSeconds: saved.position_seconds,
        completedAt: saved.completed_at,
        revision: saved.revision,
      },
    }),
  );
}
