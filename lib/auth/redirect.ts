const unsafeRedirectPattern = /[\\\u0000-\u001f\u007f]/;

export function getSafeRedirectPath(
  candidate: string | null,
  fallback = "/",
): string {
  if (
    candidate === null ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    unsafeRedirectPattern.test(candidate)
  ) {
    return fallback;
  }

  return candidate;
}

export function getSafeRedirectUrl(
  origin: string,
  candidate: string | null,
  fallback = "/",
) {
  return new URL(getSafeRedirectPath(candidate, fallback), origin);
}
