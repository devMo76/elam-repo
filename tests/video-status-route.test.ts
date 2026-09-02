import { afterEach, describe, expect, it, vi } from "vitest";

const { MockVideoStatusRequestError } = vi.hoisted(() => ({
  MockVideoStatusRequestError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/lib/video/status", () => ({
  getLessonVideoStatus: vi.fn(),
  VideoStatusRequestError: MockVideoStatusRequestError,
}));

import { GET } from "@/app/api/instructor/lessons/[lessonId]/video-status/route";
import { getLessonVideoStatus } from "@/lib/video/status";

const lessonId = "11111111-1111-4111-8111-111111111111";
const getLessonVideoStatusMock = vi.mocked(getLessonVideoStatus);

function requestStatus(id: string) {
  return GET(new Request("http://localhost"), {
    params: Promise.resolve({ lessonId: id }),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("video status route", () => {
  it("returns private uncached encoding progress", async () => {
    getLessonVideoStatusMock.mockResolvedValue({
      data: {
        mediaStatus: "processing",
        encodingProgress: 47,
      },
    });

    const response = await requestStatus(lessonId);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      data: {
        mediaStatus: "processing",
        encodingProgress: 47,
      },
    });
  });

  it("rejects an invalid lesson identifier before calling the service", async () => {
    const response = await requestStatus("not-a-uuid");

    expect(response.status).toBe(404);
    expect(getLessonVideoStatusMock).not.toHaveBeenCalled();
  });

  it("preserves controlled authorization failures", async () => {
    getLessonVideoStatusMock.mockRejectedValue(
      new MockVideoStatusRequestError(
        403,
        "forbidden",
        "You cannot manage video for this lesson.",
      ),
    );

    const response = await requestStatus(lessonId);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "forbidden" },
    });
  });

  it("hides unexpected internal failures", async () => {
    getLessonVideoStatusMock.mockRejectedValue(new Error("unexpected"));

    const response = await requestStatus(lessonId);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "video_status_failed" },
    });
  });
});
