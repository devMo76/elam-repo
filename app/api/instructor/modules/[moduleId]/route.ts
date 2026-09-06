import { z } from "zod";

import { deleteCourseModule, renameCourseModule } from "@/lib/authoring/modules";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { authoringModuleResponseSchema, updateModuleRequestSchema } from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type ModuleRouteContext = { params: Promise<{ moduleId: string }> };

async function parseModuleId(context: ModuleRouteContext) {
  return z.uuid().safeParse((await context.params).moduleId);
}

export async function PATCH(request: Request, context: ModuleRouteContext) {
  const moduleId = await parseModuleId(context);
  if (!moduleId.success) return createApiError(404, "module_not_found", "The module was not found.");

  const body = await parseJsonBody(request, updateModuleRequestSchema);
  if (!body.success) return body.response;

  try {
    const updatedModule = await renameCourseModule(moduleId.data, body.data.title);
    return Response.json(authoringModuleResponseSchema.parse({ data: updatedModule }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "module_update_failed");
  }
}

export async function DELETE(_request: Request, context: ModuleRouteContext) {
  const moduleId = await parseModuleId(context);
  if (!moduleId.success) return createApiError(404, "module_not_found", "The module was not found.");

  try {
    await deleteCourseModule(moduleId.data);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createAuthoringErrorResponse(error, "module_delete_failed");
  }
}
