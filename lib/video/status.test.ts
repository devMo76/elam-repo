import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/video/bunny", () => ({ getBunnyVideo: vi.fn() }));
vi.mock("@/lib/video/lesson-access", () => ({
  getManagedVideoLesson: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getBunnyVideo } from "@/lib/video/bunny";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLessonVideoStatus,
  VideoStatusRequestError,
} from "@/lib/video/status";

const lessonId = "11111111-1111-4111-8111-111111111111";
const videoId = "22222222-2222-4222-8222-222222222222";
const getBunnyVideoMock = vi.mocked(getBunnyVideo);
const getManagedVideoLessonMock = vi.mocked(getManagedVideoLesson);
const createAdminClientMock = vi.mocked(createAdminClient);

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

function mockLessonStatusUpdate(error: { message: string } | null = null) {
  const completedUpdate = vi.fn().mockResolvedValue({ error });
  const scopedUpdate = vi.fn().mockReturnValue({ eq: completedUpdate });
  const update = vi.fn().mockReturnValue({ eq: scopedUpdate });
  const from = vi.fn().mockReturnValue({ update });

  createAdminClientMock.mockReturnValue({ from } as never);

  return { from, update, scopedUpdate, completedUpdate };
}

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
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("synchronizes a completed Bunny video when a webhook cannot reach localhost", async () => {
    allowLesson("processing", videoId);
    const update = mockLessonStatusUpdate();
    getBunnyVideoMock.mockResolvedValue({
      guid: videoId,
      videoLibraryId: 741401,
      length: 132,
      status: 4,
      encodeProgress: 100,
    });

    await expect(getLessonVideoStatus(lessonId)).resolves.toEqual({
      data: {
        mediaStatus: "ready",
        encodingProgress: 100,
      },
    });
    expect(update.update).toHaveBeenCalledWith({
      media_status: "ready",
      duration_seconds: 132,
    });
    expect(update.scopedUpdate).toHaveBeenCalledWith("id", lessonId);
    expect(update.completedUpdate).toHaveBeenCalledWith("video_asset_id", videoId);
  });

  it("reports a controlled error when the synchronized status cannot be saved", async () => {
    allowLesson("uploading", videoId);
    mockLessonStatusUpdate({ message: "database unavailable" });
    getBunnyVideoMock.mockResolvedValue({
      guid: videoId,
      videoLibraryId: 741401,
      length: 0,
      status: 2,
      encodeProgress: 10,
    });

    await expect(getLessonVideoStatus(lessonId)).rejects.toMatchObject({
      status: 500,
      code: "video_status_update_failed",
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
