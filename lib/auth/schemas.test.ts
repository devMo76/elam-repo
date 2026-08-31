import { describe, expect, it } from "vitest";

import {
  registerSchema,
  requestPasswordResetSchema,
  signInSchema,
  updatePasswordSchema,
} from "./schemas";

describe("authentication schemas", () => {
  it("normalizes valid registration data", () => {
    const result = registerSchema.parse({
      email: "LEARNER@EXAMPLE.COM",
      password: "safe-password",
      fullName: "  New Learner  ",
    });

    expect(result).toEqual({
      email: "learner@example.com",
      password: "safe-password",
      fullName: "New Learner",
    });
  });

  it("rejects short registration passwords", () => {
    const result = registerSchema.safeParse({
      email: "learner@example.com",
      password: "short",
      fullName: "New Learner",
    });

    expect(result.success).toBe(false);
  });

  it("rejects role injection during registration", () => {
    const result = registerSchema.safeParse({
      email: "learner@example.com",
      password: "safe-password",
      fullName: "New Learner",
      role: "admin",
    });

    expect(result.success).toBe(false);
  });

  it("accepts the supported sign-in shape", () => {
    expect(
      signInSchema.safeParse({
        email: "learner@example.com",
        password: "password",
      }).success,
    ).toBe(true);
  });

  it("accepts only an email for password-reset requests", () => {
    expect(
      requestPasswordResetSchema.safeParse({
        email: "learner@example.com",
      }).success,
    ).toBe(true);
  });

  it("validates replacement passwords", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "new-safe-password" })
        .success,
    ).toBe(true);
    expect(updatePasswordSchema.safeParse({ password: "short" }).success).toBe(
      false,
    );
  });
});
