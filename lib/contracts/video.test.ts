import { describe, expect, it } from "vitest";

import {
  bunnyWebhookSchema,
  directVideoUploadResponseSchema,
  lessonPlaybackResponseSchema,
  lessonProgressRequestSchema,
  lessonProgressResponseSchema,
  lessonVideoStatusResponseSchema,
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

  it("normalizes Bunny webhook integers and ignores provider additions", () => {
    expect(
      bunnyWebhookSchema.parse({
        VideoLibraryId: "741401",
        VideoGuid: videoId,
        Status: "4",
        ProviderAddedField: "ignored",
      }),
    ).toEqual({
      VideoLibraryId: 741401,
      VideoGuid: videoId,
      Status: 4,
    });

    expect(
      bunnyWebhookSchema.parse({
        VideoLibraryId: 741401,
        VideoGuid: videoId,
        Status: 4,
      }),
    ).toEqual({
      VideoLibraryId: 741401,
      VideoGuid: videoId,
      Status: 4,
    });
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

  it("accepts completed Supabase progress timestamps with UTC offsets", () => {
    const completedAt = "2026-09-02T03:42:36.123+00:00";

    expect(
      lessonProgressResponseSchema.parse({
        data: {
          positionSeconds: 170,
          completedAt,
          revision: 2,
        },
      }),
    ).toEqual({
      data: {
        positionSeconds: 170,
        completedAt,
        revision: 2,
      },
    });

    expect(
      lessonPlaybackResponseSchema.safeParse({
        data: {
          playbackUrl: `https://player.mediadelivery.net/embed/741401/${videoId}`,
          expiresAt: "2026-09-02T05:42:36.123Z",
          progress: {
            positionSeconds: 170,
            completedAt,
            revision: 2,
          },
        },
      }).success,
    ).toBe(true);
  });

  it("accepts bounded encoding progress without provider credentials", () => {
    expect(
      lessonVideoStatusResponseSchema.parse({
        data: {
          mediaStatus: "processing",
          encodingProgress: 47,
        },
      }),
    ).toEqual({
      data: {
        mediaStatus: "processing",
        encodingProgress: 47,
      },
    });

    expect(
      lessonVideoStatusResponseSchema.safeParse({
        data: {
          mediaStatus: "processing",
          encodingProgress: 101,
        },
      }).success,
    ).toBe(false);

    expect(
      lessonVideoStatusResponseSchema.safeParse({
        data: {
          mediaStatus: "processing",
          encodingProgress: 47,
          apiKey: "must-not-be-exposed",
        },
      }).success,
    ).toBe(false);
  });
});
