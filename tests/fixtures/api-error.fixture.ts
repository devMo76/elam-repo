import type { ApiErrorResponse } from "@/lib/contracts";

export const validationErrorFixture = {
  error: {
    code: "validation_error",
    message: "The submitted data is invalid.",
    fieldErrors: {
      title: ["Title is required."],
    },
  },
} satisfies ApiErrorResponse;
