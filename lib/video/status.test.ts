import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/video/bunny", () => ({ getBunnyVideo: vi.fn() }));
vi.mock("@/lib/video/lesson-access", () => ({
  getManagedVideoLesson: vi.fn(),
}));

import { getBunnyVideo } from "@/lib/video/bunny";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";
import {
  getLessonVideoStatus,
  VideoStatusRequestError,
} from "@/lib/video/status";

const lessonId = "11111111-1111-4111-8111-111111111111";
const videoId = "22222222-2222-4222-8222-222222222222";
const getBunnyVideoMock = vi.mocked(getBunnyVideo);
const getManagedVideoLessonMock = vi.mocked(getManagedVideoLesson);

function allowLesson(
  mediaStatus: "absent" | "uploading" | "processing" | "ready" | "failed",
  videoAssetId: string | null,
) {
  getManagedVideoLessonMock.mockResolvedValue({
    success: true,
    lesson: {
      id: lessonId,
      title: "Test lesson",
      mediaStatus,
      videoAssetId,
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("lesson video encoding status", () => {
  it("returns live Bunny progress while processing", async () => {
    allowLesson("processing", videoId);
    getBunnyVideoMock.mockResolvedValue({
      guid: videoId,
      videoLibraryId: 741401,
      length: 0,
      status: 2,
      encodeProgress: 47,
    });

    await expect(getLessonVideoStatus(lessonId)).resolves.toEqual({
      data: {
        mediaStatus: "processing",
        encodingProgress: 47,
      },
    });
  });

  it("does not call Bunny for terminal lesson states", async () => {
    allowLesson("ready", videoId);

    await expect(getLessonVideoStatus(lessonId)).resolves.toEqual({
      data: {
        mediaStatus: "ready",
        encodingProgress: 100,
      },
    });
    expect(getBunnyVideoMock).not.toHaveBeenCalled();

    allowLesson("failed", videoId);
    await expect(getLessonVideoStatus(lessonId)).resolves.toEqual({
      data: {
        mediaStatus: "failed",
        encodingProgress: null,
      },
    });
    expect(getBunnyVideoMock).not.toHaveBeenCalled();
  });

  it("preserves authorization failures", async () => {
    getManagedVideoLessonMock.mockResolvedValue({
      success: false,
      status: 403,
      code: "forbidden",
      message: "You cannot manage video for this lesson.",
    });

    await expect(getLessonVideoStatus(lessonId)).rejects.toMatchObject({
      status: 403,
      code: "forbidden",
    });
  });

  it("rejects an inconsistent active video state", async () => {
    allowLesson("processing", null);

    await expect(getLessonVideoStatus(lessonId)).rejects.toMatchObject({
      status: 500,
      code: "invalid_video_state",
    });
  });

  it("maps Bunny failures to a controlled gateway error", async () => {
    allowLesson("processing", videoId);
    getBunnyVideoMock.mockRejectedValue(new Error("provider failed"));

    await expect(getLessonVideoStatus(lessonId)).rejects.toEqual(
      expect.objectContaining<Partial<VideoStatusRequestError>>({
        status: 502,
        code: "video_provider_unavailable",
      }),
    );
  });
});
