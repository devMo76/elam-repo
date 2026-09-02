import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { POST } from "@/app/api/lessons/[lessonId]/progress/route";
import { createClient } from "@/lib/supabase/server";

const lessonId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const createClientMock = vi.mocked(createClient);

function configureClient(completedAt: string) {
  createClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          position_seconds: 170,
          completed_at: completedAt,
          revision: 2,
        },
      ],
      error: null,
    }),
  } as never);
}

function saveProgress() {
  return POST(
    new Request(`http://localhost/api/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionSeconds: 170,
        revision: 1,
        markComplete: false,
      }),
    }),
    { params: Promise.resolve({ lessonId }) },
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("progress route response", () => {
  it("returns completed progress containing a Supabase UTC offset", async () => {
    configureClient("2026-09-02T03:42:36.123+00:00");

    const response = await saveProgress();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        positionSeconds: 170,
        completedAt: "2026-09-02T03:42:36.123+00:00",
        revision: 2,
      },
    });
  });

  it("returns structured JSON when saved progress is malformed", async () => {
    configureClient("not-a-timestamp");

    const response = await saveProgress();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "progress_response_invalid" },
    });
  });
});
