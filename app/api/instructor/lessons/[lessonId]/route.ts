import { z } from "zod";

import {
  deleteModuleLesson,
  updateModuleLesson,
} from "@/lib/authoring/lessons";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import {
  authoringLessonResponseSchema,
  updateLessonRequestSchema,
} from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type LessonRouteContext = { params: Promise<{ lessonId: string }> };

async function parseLessonId(context: LessonRouteContext) {
  return z.uuid().safeParse((await context.params).lessonId);
}

export async function PATCH(request: Request, context: LessonRouteContext) {
  const lessonId = await parseLessonId(context);

  if (!lessonId.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  const body = await parseJsonBody(request, updateLessonRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const lesson = await updateModuleLesson(lessonId.data, body.data);
    return Response.json(authoringLessonResponseSchema.parse({ data: lesson }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "lesson_update_failed");
  }
}

export async function DELETE(_request: Request, context: LessonRouteContext) {
  const lessonId = await parseLessonId(context);

  if (!lessonId.success) {
    return createApiError(404, "lesson_not_found", "The lesson was not found.");
  }

  try {
    await deleteModuleLesson(lessonId.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createAuthoringErrorResponse(error, "lesson_delete_failed");
  }
}
