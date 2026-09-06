import { z } from "zod";

import { submitInstructorCourse } from "@/lib/authoring/publishing";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { authoringCourseStatusResponseSchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

type SubmitRouteContext = { params: Promise<{ courseId: string }> };

export async function POST(_request: Request, { params }: SubmitRouteContext) {
  const courseId = z.uuid().safeParse((await params).courseId);

  if (!courseId.success) {
    return createApiError(404, "course_not_found", "The course was not found.");
  }

  try {
    const result = await submitInstructorCourse(courseId.data);
    return Response.json(authoringCourseStatusResponseSchema.parse({ data: result }));
  } catch (error) {
    return createAuthoringErrorResponse(error, "course_submit_failed");
  }
}
