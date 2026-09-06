import { z } from "zod";

import { reorderCourseModules } from "@/lib/authoring/modules";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { reorderModulesRequestSchema, reorderModulesResponseSchema } from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type ModuleOrderContext = { params: Promise<{ courseId: string }> };

export async function PUT(request: Request, { params }: ModuleOrderContext) {
  const courseId = z.uuid().safeParse((await params).courseId);
  if (!courseId.success) return createApiError(404, "course_not_found", "The course was not found.");

  const body = await parseJsonBody(request, reorderModulesRequestSchema);
  if (!body.success) return body.response;

  try {
    const order = await reorderCourseModules(courseId.data, body.data.moduleIds);
    return Response.json(reorderModulesResponseSchema.parse({ data: order }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "module_reorder_failed");
  }
}
