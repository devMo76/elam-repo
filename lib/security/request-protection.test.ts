import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  protectRequest,
  resetRequestProtectionForTests,
} from "./request-protection";

afterEach(resetRequestProtectionForTests);

describe("request protection", () => {
  it("rejects cross-site mutations", () => {
    const request = new NextRequest("https://elam.test/api/checkout", {
      method: "POST",
      headers: { origin: "https://attacker.test" },
    });

    expect(protectRequest(request)?.status).toBe(403);
  });

  it("allows authenticated provider webhooks without a browser origin", () => {
    const request = new NextRequest("https://elam.test/api/webhooks/moyasar", {
      method: "POST",
      headers: { origin: "https://api.moyasar.com" },
    });

    expect(protectRequest(request)).toBeNull();
  });

  it("rate limits repeated sensitive requests", () => {
    let response = null;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = protectRequest(
        new NextRequest("https://elam.test/api/auth/sign-in", {
          method: "POST",
          headers: {
            origin: "https://elam.test",
            "x-forwarded-for": "203.0.113.1",
          },
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
  });
});
