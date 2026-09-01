import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  createBunnyPlaybackCredential,
  createBunnyUploadAuthorization,
  createBunnyVideo,
} from "@/lib/video/bunny";

const videoId = "11111111-1111-4111-8111-111111111111";

function configureEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv(
    ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
    "test-service-role",
  );
  vi.stubEnv("BUNNY_STREAM_LIBRARY_ID", "741401");
  vi.stubEnv("BUNNY_STREAM_API_KEY", "test-api-key");
  vi.stubEnv("BUNNY_STREAM_READ_ONLY_API_KEY", "test-read-only-key");
  vi.stubEnv("BUNNY_STREAM_TOKEN_KEY", "test-token-key");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Bunny Stream adapter", () => {
  it("creates scoped upload credentials without exposing the API key", () => {
    configureEnvironment();

    const now = Date.UTC(2026, 8, 1);
    const authorization = createBunnyUploadAuthorization(videoId, now);
    const expires = Math.floor(now / 1000) + 7200;

    const expectedSignature = createHash("sha256")
      .update(`741401test-api-key${expires}${videoId}`)
      .digest("hex");

    expect(authorization).toEqual({
      endpoint: "https://video.bunnycdn.com/tusupload",
      expiresAt: new Date(expires * 1000).toISOString(),
      headers: {
        AuthorizationSignature: expectedSignature,
        AuthorizationExpire: String(expires),
        LibraryId: "741401",
        VideoId: videoId,
      },
    });

    expect(JSON.stringify(authorization)).not.toContain("test-api-key");
  });

  it("creates a Bunny video through the server API", async () => {
    configureEnvironment();

    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        guid: videoId,
        videoLibraryId: 741401,
        length: 0,
        status: 0,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(createBunnyVideo("Test lesson")).resolves.toMatchObject({
      guid: videoId,
      status: 0,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      AccessKey: "test-api-key",
    });
  });

  it("creates a short-lived signed Player v2 URL", () => {
    configureEnvironment();

    const now = Date.UTC(2026, 8, 1);
    const expires = Math.floor(now / 1000) + 7200;
    const credential = createBunnyPlaybackCredential(videoId, now);
    const playbackUrl = new URL(credential.playbackUrl);
    const expectedToken = createHash("sha256")
      .update(`test-token-key${videoId}${expires}`)
      .digest("hex");

    expect(playbackUrl.origin).toBe("https://player.mediadelivery.net");
    expect(playbackUrl.pathname).toBe(`/embed/741401/${videoId}`);
    expect(playbackUrl.searchParams.get("token")).toBe(expectedToken);
    expect(playbackUrl.searchParams.get("expires")).toBe(String(expires));
    expect(credential.expiresAt).toBe(
      new Date(expires * 1000).toISOString(),
    );
  });
});
