import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/video/bunny", () => ({ createBunnyPlaybackCredential: vi.fn() }));

import { GET } from "@/app/api/lessons/[lessonId]/playback/route";
import { createClient } from "@/lib/supabase/server";
import { createBunnyPlaybackCredential } from "@/lib/video/bunny";

const lessonId = "60000000-0000-4000-8000-000000000001";
const videoId = "70000000-0000-4000-8000-000000000001";
const ready = { video_asset_id: videoId, duration_seconds: 60, media_status: "ready" };
function request(id = lessonId) {
  return GET(new Request(`http://localhost/api/lessons/${id}/playback`), { params: Promise.resolve({ lessonId: id }) });
}
function configure(rows: unknown[], error: object | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: rows, error });
  const progress = vi.fn().mockResolvedValue({ data: null, error: null });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: progress };
  vi.mocked(createClient).mockResolvedValue({ rpc,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner" } } }) },
    from: vi.fn().mockReturnValue(query),
  } as never);
  vi.mocked(createBunnyPlaybackCredential).mockReturnValue({
    playbackUrl: `https://player.mediadelivery.net/embed/1/${videoId}?token=signed`,
    expiresAt: "2099-01-01T00:00:00Z",
  });
  return { rpc, progress };
}
afterEach(() => vi.resetAllMocks());

describe("signed lesson playback shared by learners and instructor previews", () => {
  it("issues a private uncached credential only after the access RPC authorizes the lesson", async () => {
    const { rpc } = configure([ready]);
    const response = await request();
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("get_lesson_playback_access", { target_lesson: lessonId });
    expect(createBunnyPlaybackCredential).toHaveBeenCalledWith(videoId);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ data: { progress: null, expiresAt: "2099-01-01T00:00:00Z" } });
  });
  it("does not mint a credential for an unauthorized lesson", async () => {
    configure([]);
    expect((await request()).status).toBe(403);
    expect(createBunnyPlaybackCredential).not.toHaveBeenCalled();
  });
  it.each(["uploading", "processing", "failed", "absent"])("does not expose %s media", async media_status => {
    configure([{ ...ready, media_status }]);
    expect((await request()).status).toBe(409);
    expect(createBunnyPlaybackCredential).not.toHaveBeenCalled();
  });
  it("fails closed when the authorization query fails", async () => {
    configure([], { message: "database unavailable" });
    expect((await request()).status).toBe(500);
    expect(createBunnyPlaybackCredential).not.toHaveBeenCalled();
  });
  it("rejects invalid lesson IDs before querying access", async () => {
    expect((await request("invalid")).status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });
});
