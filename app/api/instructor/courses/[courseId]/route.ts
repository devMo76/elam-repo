import { z } from "zod";

import { getInstructorCourse, updateInstructorCourse } from "@/lib/authoring/courses";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import {
  authoringCourseResponseSchema,
  updateAuthoringCourseRequestSchema,
} from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

type CourseRouteContext = { params: Promise<{ courseId: string }> };

async function parseCourseId(context: CourseRouteContext) {
  return z.uuid().safeParse((await context.params).courseId);
}

export async function GET(_request: Request, context: CourseRouteContext) {
  const courseId = await parseCourseId(context);
  if (!courseId.success) return createApiError(404, "course_not_found", "The course was not found.");

  try {
    const course = await getInstructorCourse(courseId.data);
    return Response.json(authoringCourseResponseSchema.parse({ data: course }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "course_load_failed");
  }
}

export async function PATCH(request: Request, context: CourseRouteContext) {
  const courseId = await parseCourseId(context);
  if (!courseId.success) return createApiError(404, "course_not_found", "The course was not found.");

  const body = await parseJsonBody(request, updateAuthoringCourseRequestSchema);
  if (!body.success) return body.response;

  try {
    const course = await updateInstructorCourse(courseId.data, body.data);
    return Response.json(authoringCourseResponseSchema.parse({ data: course }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "course_update_failed");
  }
}
