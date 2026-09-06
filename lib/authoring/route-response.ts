import { createApiError } from "@/lib/http/api-response";

import { AuthoringError } from "./errors";

export function createAuthoringErrorResponse(error: unknown, fallbackCode: string) {
  if (error instanceof AuthoringError) {
    return createApiError(error.status, error.code, error.message);
  }

  return createApiError(500, fallbackCode, "The authoring request could not be completed.");
}
