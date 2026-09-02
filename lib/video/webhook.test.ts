import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  mapBunnyStatus,
  verifyBunnyWebhookSignature,
} from "@/lib/video/webhook";

const rawBody = JSON.stringify({
  VideoLibraryId: 741401,
  VideoGuid: "11111111-1111-4111-8111-111111111111",
  Status: 3,
});

function createSignedHeaders(body = rawBody) {
  return new Headers({
    "X-BunnyStream-Signature-Version": "v1",
    "X-BunnyStream-Signature-Algorithm": "hmac-sha256",
    "X-BunnyStream-Signature": createHmac("sha256", "read-only-key")
      .update(body)
      .digest("hex"),
  });
}

describe("Bunny Stream webhooks", () => {
  it("accepts an authentic signature over the exact raw body", () => {
    expect(
      verifyBunnyWebhookSignature(
        rawBody,
        createSignedHeaders(),
        "read-only-key",
      ),
    ).toBe(true);
  });

  it("rejects tampered bodies and unsupported signature metadata", () => {
    expect(
      verifyBunnyWebhookSignature(
        `${rawBody} `,
        createSignedHeaders(),
        "read-only-key",
      ),
    ).toBe(false);

    const headers = createSignedHeaders();
    headers.set("X-BunnyStream-Signature-Version", "v2");

    expect(
      verifyBunnyWebhookSignature(rawBody, headers, "read-only-key"),
    ).toBe(false);
  });

  it("maps provider states without treating ancillary events as regressions", () => {
    expect(mapBunnyStatus(0)).toBe("uploading");
    expect(mapBunnyStatus(2)).toBe("processing");
    expect(mapBunnyStatus(4)).toBe("ready");
    expect(mapBunnyStatus(5)).toBe("failed");
    expect(mapBunnyStatus(9)).toBeNull();
    expect(mapBunnyStatus(10)).toBeNull();
  });
});
