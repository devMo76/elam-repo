import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "./security-headers";

describe("security response headers", () => {
  it("enforces safe baseline protections without blocking payment/video frames", () => {
    const headers = new Map(getSecurityHeaders("https://staging.supabase.co").map((header) => [header.key, header.value]));
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).not.toContain("frame-src");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("observes the known Supabase, Moyasar, and Bunny origins in report-only mode", () => {
    const headers = new Map(getSecurityHeaders("https://staging.supabase.co").map((header) => [header.key, header.value]));
    const csp = headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toContain("https://staging.supabase.co");
    expect(csp).toContain("https://cdn.moyasar.com");
    expect(csp).toContain("https://video.bunnycdn.com");
    expect(csp).toContain("frame-src 'self' https:");
  });
});
