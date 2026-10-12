type Header = { key: string; value: string };

export function getSecurityHeaders(supabaseUrl?: string): Header[] {
  let supabaseOrigin = "";
  try { if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin; } catch { /* Invalid env is rejected elsewhere. */ }
  const reportOnlyCsp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://cdn.moyasar.com https://assets.mediadelivery.net`,
    "style-src 'self' 'unsafe-inline' https://cdn.moyasar.com",
    `connect-src 'self' ${supabaseOrigin} https://api.moyasar.com https://video.bunnycdn.com wss:`.trim(),
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "frame-src 'self' https:", // 3-D Secure issuer origins vary; narrow after staging traces.
    "media-src 'self' blob: https:",
    "form-action 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
    { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
