import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { MockVideoUploadRequestError } = vi.hoisted(() => ({
  MockVideoUploadRequestError: class extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/lib/video/upload", () => ({
  cancelLessonVideoUpload: vi.fn(),
  requestLessonVideoUpload: vi.fn(),
  VideoUploadRequestError: MockVideoUploadRequestError,
}));

import { DELETE } from "@/app/api/instructor/lessons/[lessonId]/upload/route";
import { cancelLessonVideoUpload } from "@/lib/video/upload";

const lessonId = "11111111-1111-4111-8111-111111111111";
const cancelLessonVideoUploadMock = vi.mocked(cancelLessonVideoUpload);

afterEach(() => vi.clearAllMocks());

describe("video upload cancellation route", () => {
  it("cancels an owned upload", async () => {
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ lessonId }),
    });

    expect(response.status).toBe(204);
    expect(cancelLessonVideoUploadMock).toHaveBeenCalledWith(lessonId);
  });

  it("rejects an invalid lesson identifier", async () => {
    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ lessonId: "invalid" }),
    });

    expect(response.status).toBe(404);
    expect(cancelLessonVideoUploadMock).not.toHaveBeenCalled();
  });

  it("preserves authorization failures", async () => {
    cancelLessonVideoUploadMock.mockRejectedValue(
      new MockVideoUploadRequestError(403, "forbidden", "Not permitted."),
    );

    const response = await DELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ lessonId }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "forbidden" } });
  });
});
