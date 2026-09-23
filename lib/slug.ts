/**
 * Course codes contain a space ("EE 301"), which cannot go in a URL path
 * unescaped and reads badly when percent-encoded. Routes use "ee-301".
 *
 * The mapping is deliberately lossless and reversible so the detail route can
 * recover the canonical code from the slug without a lookup table. If course
 * codes ever gain a hyphen of their own, this stops being reversible and the
 * route should switch to an explicit slug field on Course.
 */

export function courseSlug(code: string): string {
  return code.toLowerCase().replace(/\s+/g, "-");
}

export function codeFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").toUpperCase();
}
