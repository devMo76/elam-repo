import { z } from "zod";

import { reorderModuleLessons } from "@/lib/authoring/lessons";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import {
  reorderLessonsRequestSchema,
  reorderLessonsResponseSchema,
} from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type LessonOrderContext = { params: Promise<{ moduleId: string }> };

export async function PUT(request: Request, { params }: LessonOrderContext) {
  const moduleId = z.uuid().safeParse((await params).moduleId);

  if (!moduleId.success) {
    return createApiError(404, "module_not_found", "The module was not found.");
  }

  const body = await parseJsonBody(request, reorderLessonsRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    const order = await reorderModuleLessons(moduleId.data, body.data.lessonIds);
    return Response.json(reorderLessonsResponseSchema.parse({ data: order }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "lesson_reorder_failed");
  }
}
