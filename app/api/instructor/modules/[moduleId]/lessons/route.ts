import { z } from "zod";

import { createModuleLesson } from "@/lib/authoring/lessons";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import {
  authoringLessonResponseSchema,
  createLessonRequestSchema,
} from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type LessonCollectionContext = { params: Promise<{ moduleId: string }> };

export async function POST(
  request: Request,
  { params }: LessonCollectionContext,
) {
  const moduleId = z.uuid().safeParse((await params).moduleId);

  if (!moduleId.success) {
    return createApiError(404, "module_not_found", "The module was not found.");
  }

  const body = await parseJsonBody(request, createLessonRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const lesson = await createModuleLesson(moduleId.data, body.data.title);
    return Response.json(authoringLessonResponseSchema.parse({ data: lesson }), {
      status: 201,
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "lesson_create_failed");
  }
}
