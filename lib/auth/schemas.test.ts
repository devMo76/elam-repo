import { describe, expect, it } from "vitest";

import {
  registerSchema,
  resendConfirmationSchema,
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
      next: "/courses/signals-and-systems-ee301",
    });

    expect(result).toEqual({
      email: "learner@example.com",
      password: "safe-password",
      fullName: "New Learner",
      next: "/courses/signals-and-systems-ee301",
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

  it("accepts only an email for confirmation resends", () => {
    expect(
      resendConfirmationSchema.safeParse({
        email: "learner@example.com",
      }).success,
    ).toBe(true);
    expect(
      resendConfirmationSchema.safeParse({
        email: "learner@example.com",
        role: "admin",
      }).success,
    ).toBe(false);
  });

  it("accepts a bounded redirect candidate for server-side safety validation", () => {
    expect(
      resendConfirmationSchema.parse({
        email: "learner@example.com",
        next: "/courses/signals-and-systems-ee301?lesson=preview",
      }),
    ).toEqual({
      email: "learner@example.com",
      next: "/courses/signals-and-systems-ee301?lesson=preview",
    });

    expect(
      resendConfirmationSchema.safeParse({
        email: "learner@example.com",
        next: "/" + "a".repeat(2_048),
      }).success,
    ).toBe(false);
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
