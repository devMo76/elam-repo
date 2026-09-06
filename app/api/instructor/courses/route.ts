import {
  authoringCourseListResponseSchema,
  authoringCourseResponseSchema,
  createAuthoringCourseRequestSchema,
} from "@/lib/contracts";
import { createInstructorCourse, listInstructorCourses } from "@/lib/authoring/courses";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const courses = await listInstructorCourses();
    return Response.json(authoringCourseListResponseSchema.parse({ data: courses }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "course_list_failed");
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request, createAuthoringCourseRequestSchema);
  if (!body.success) return body.response;

  try {
    const course = await createInstructorCourse(body.data);
    return Response.json(authoringCourseResponseSchema.parse({ data: course }), {
      status: 201,
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "course_create_failed");
  }
}
