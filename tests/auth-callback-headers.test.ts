import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("configured callback response headers", () => {
  it("overrides the global referrer policy only on the credential callback", async () => {
    const rules = await nextConfig.headers!();
    const globalRule = rules.find((rule) => rule.source === "/:path*");
    const callbackRule = rules.find((rule) => rule.source === "/auth/callback");

    expect(globalRule?.headers).toContainEqual({
      key: "Referrer-Policy", value: "strict-origin-when-cross-origin",
    });
    expect(callbackRule?.headers).toContainEqual({
      key: "Referrer-Policy", value: "no-referrer",
    });
    expect(rules.indexOf(callbackRule!)).toBeGreaterThan(rules.indexOf(globalRule!));
  });
});
