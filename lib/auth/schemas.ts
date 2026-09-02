import { z } from "zod";

const emailSchema = z
  .email()
  .max(254)
  .transform((email) => email.trim().toLowerCase());

const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(100),
});

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const requestPasswordResetSchema = z.strictObject({
  email: emailSchema,
});

export const updatePasswordSchema = z.strictObject({
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
