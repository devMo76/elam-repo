import { createApiError } from "@/lib/http/api-response";
import { courseSubmissionReadinessErrorResponseSchema } from "@/lib/contracts";

import { AuthoringError, CourseNotReadyError } from "./errors";

export function createAuthoringErrorResponse(error: unknown, fallbackCode: string) {
  if (error instanceof CourseNotReadyError) {
    return Response.json(
      courseSubmissionReadinessErrorResponseSchema.parse({
        error: {
          code: error.code,
          message: error.message,
          blockers: error.blockers,
        },
      }),
      { status: error.status },
    );
  }

  if (error instanceof AuthoringError) {
    return createApiError(error.status, error.code, error.message);
  }

  return createApiError(500, fallbackCode, "The authoring request could not be completed.");
}
