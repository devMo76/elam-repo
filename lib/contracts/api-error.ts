import { z } from "zod";

export const apiErrorCodeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Error codes must use lower_snake_case.");

export const apiFieldErrorsSchema = z.record(
  z.string(),
  z.array(z.string().min(1)),
);

export const apiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    fieldErrors: apiFieldErrorsSchema.optional(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
