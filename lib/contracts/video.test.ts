import { describe, expect, it } from "vitest";

import {
  directVideoUploadResponseSchema,
  lessonPlaybackResponseSchema,
  lessonProgressRequestSchema,
} from "@/lib/contracts/video";

const videoId = "11111111-1111-4111-8111-111111111111";

describe("video contracts", () => {
  it("accepts a direct upload response without an API key", () => {
    expect(
      directVideoUploadResponseSchema.safeParse({
        data: {
          videoId,
          upload: {
            endpoint: "https://video.bunnycdn.com/tusupload",
            expiresAt: "2026-09-01T02:00:00.000Z",
            headers: {
              AuthorizationSignature: "a".repeat(64),
              AuthorizationExpire: "1788228000",
              LibraryId: "741401",
              VideoId: videoId,
            },
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects watermark and permanent playback fields", () => {
    expect(
      lessonPlaybackResponseSchema.safeParse({
        data: {
          playbackUrl: `https://player.mediadelivery.net/embed/741401/${videoId}`,
          expiresAt: "2026-09-01T02:00:00.000Z",
          progress: null,
          watermark: "learner@example.invalid",
        },
      }).success,
    ).toBe(false);
  });

  it("requires an optimistic revision for progress writes", () => {
    expect(
      lessonProgressRequestSchema.safeParse({
        positionSeconds: 120,
        revision: 2,
      }).success,
    ).toBe(true);

    expect(
      lessonProgressRequestSchema.safeParse({
        positionSeconds: 120,
      }).success,
    ).toBe(false);
  });
});
