import { NextResponse } from "next/server";
import type { z } from "zod";

import type { ApiErrorResponse } from "@/lib/contracts";

type FieldErrors = NonNullable<ApiErrorResponse["error"]["fieldErrors"]>;

export function createApiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(fieldErrors === undefined ? {} : { fieldErrors }),
    },
  };

  return NextResponse.json(body, { status });
}

function getFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    fieldErrors[field] ??= [];
    fieldErrors[field].push(issue.message);
  }

  return fieldErrors;
}

export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<
  | { success: true; data: z.output<Schema> }
  | { success: false; response: NextResponse<ApiErrorResponse> }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: createApiError(
        400,
        "invalid_json",
        "The request body must contain valid JSON.",
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      response: createApiError(
        422,
        "validation_failed",
        "One or more request fields are invalid.",
        getFieldErrors(result.error),
      ),
    };
  }

  return { success: true, data: result.data };
}
