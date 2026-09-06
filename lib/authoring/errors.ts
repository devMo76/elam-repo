export class AuthoringError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthoringError";
  }
}

export function throwAuthoringDatabaseError(
  error: { code?: string } | null,
  fallbackMessage: string,
): never {
  if (error?.code === "23505") {
    throw new AuthoringError(
      409,
      "course_slug_conflict",
      "Another course already uses this slug.",
    );
  }

  if (error?.code === "22023") {
    throw new AuthoringError(422, "invalid_authoring_order", "The supplied order is invalid.");
  }

  if (error?.code === "42501") {
    throw new AuthoringError(403, "forbidden", "You cannot modify this course.");
  }

  throw new AuthoringError(500, "authoring_failed", fallbackMessage);
}
