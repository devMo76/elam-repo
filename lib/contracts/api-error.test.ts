import { describe, expect, it } from "vitest";

import { validationErrorFixture } from "@/tests/fixtures/api-error.fixture";

import { apiErrorResponseSchema } from "./api-error";

describe("apiErrorResponseSchema", () => {
  it("accepts the shared validation-error fixture", () => {
    const result = apiErrorResponseSchema.safeParse(validationErrorFixture);

    expect(result.success).toBe(true);
  });

  it("rejects error codes that do not use lower_snake_case", () => {
    const result = apiErrorResponseSchema.safeParse({
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted data is invalid.",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects unapproved fields", () => {
    const result = apiErrorResponseSchema.safeParse({
      error: {
        code: "bad_request",
        message: "The submitted data is invalid.",
        stack: "Sensitive stack trace",
      },
    });

    expect(result.success).toBe(false);
  });
});
