import { z } from "zod";

import { createApiError } from "@/lib/http/api-response";
import {
  requestLessonVideoUpload,
  VideoUploadRequestError,
} from "@/lib/video/upload";

export const runtime = "nodejs";

type UploadRouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function POST(
  _request: Request,
  { params }: UploadRouteContext,
) {
  const result = z.uuid().safeParse((await params).lessonId);

  if (!result.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  try {
    const response = await requestLessonVideoUpload(result.data);
    return Response.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof VideoUploadRequestError) {
      return createApiError(error.status, error.code, error.message);
    }

    return createApiError(
      500,
      "video_upload_failed",
      "The video upload could not be prepared.",
    );
  }
}
