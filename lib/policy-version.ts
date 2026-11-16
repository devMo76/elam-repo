// Source PDF SHA-256: 902a50dfd295ad76c4da60e9a40f04f18d8decef03ed8016949ebd15cd0cdafc.
// Keep in sync with public.current_policy_version() through a new migration.
export const CURRENT_POLICY_VERSION = "2026-11-13.1";

export function policyAcceptancePath(next: string) {
  return `/auth/policy?next=${encodeURIComponent(next)}`;
}

export function requiresPolicyCheck(path: string) {
  // Recovery, sign-out and acceptance must remain usable before consent.
  // Provider-side work must never depend on a browser user's acceptance.
  if (path === "/policies" || path.startsWith("/auth/") || path.startsWith("/api/auth/")
    || path.startsWith("/api/webhooks/") || path.startsWith("/api/jobs/")
    || path === "/api/payments/callback" || path === "/api/telemetry/web-vitals"
    || path.startsWith("/_next/") || ["/favicon.ico", "/icon.png", "/robots.txt", "/sitemap.xml"].includes(path)) return false;
  return true;
}
