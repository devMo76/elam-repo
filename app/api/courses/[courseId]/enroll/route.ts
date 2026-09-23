import { z } from "zod";

import { claimFreeCourse, FreeCourseEnrollmentError } from "@/lib/enrollment/free";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const courseId = z.uuid().safeParse((await params).courseId);

  if (!courseId.success) {
    return createApiError(400, "invalid_course_id", "The course ID is invalid.");
  }

  try {
    return Response.json(await claimFreeCourse(courseId.data));
  } catch (error) {
    if (error instanceof FreeCourseEnrollmentError) {
      return createApiError(error.status, error.code, error.message);
    }

    return createApiError(500, "free_enrollment_failed", "The course could not be added.");
  }
}
