import { z } from "zod";

import { createCourseModule } from "@/lib/authoring/modules";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { authoringModuleResponseSchema, createModuleRequestSchema } from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type ModuleCollectionContext = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: ModuleCollectionContext) {
  const courseId = z.uuid().safeParse((await params).courseId);
  if (!courseId.success) return createApiError(404, "course_not_found", "The course was not found.");

  const body = await parseJsonBody(request, createModuleRequestSchema);
  if (!body.success) return body.response;

  try {
    const createdModule = await createCourseModule(courseId.data, body.data.title);
    return Response.json(authoringModuleResponseSchema.parse({ data: createdModule }), {
      status: 201,
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "module_create_failed");
  }
}
