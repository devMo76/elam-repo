import { z } from "zod";

import { createApiError } from "@/lib/http/api-response";
import {
  getLessonVideoStatus,
  VideoStatusRequestError,
} from "@/lib/video/status";

export const runtime = "nodejs";

type VideoStatusRouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function GET(
  _request: Request,
  { params }: VideoStatusRouteContext,
) {
  const lessonId = z.uuid().safeParse((await params).lessonId);

  if (!lessonId.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  try {
    const response = await getLessonVideoStatus(lessonId.data);

    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof VideoStatusRequestError) {
      return createApiError(error.status, error.code, error.message);
    }

    return createApiError(
      500,
      "video_status_failed",
      "The video processing status could not be loaded.",
    );
  }
}
