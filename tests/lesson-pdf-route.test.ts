import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/lessons/[lessonId]/pdf/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const lessonId = "11111111-1111-4111-8111-111111111111";
const createClientMock = vi.mocked(createClient);
const createAdminClientMock = vi.mocked(createAdminClient);

function configure(accessible: boolean) {
  createClientMock.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({
    data: accessible ? [{ video_asset_id: null }] : [], error: null,
  }) } as never);
  const sign = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example/private-token" }, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: {
    storage_path: `${lessonId}/example.pdf`, file_name: "notes.pdf", byte_size: 100,
  }, error: null });
  const admin = {
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) }),
    storage: { from: vi.fn().mockReturnValue({ createSignedUrl: sign }) },
  };
  createAdminClientMock.mockReturnValue(admin as never);
  return { sign, admin };
}

function get(suffix = "") {
  return GET(new Request(`http://localhost/api/lessons/${lessonId}/pdf${suffix}`),
    { params: Promise.resolve({ lessonId }) });
}

afterEach(() => vi.clearAllMocks());

describe("lesson PDF access route", () => {
  it("rejects a viewer without lesson entitlement before reading private metadata", async () => {
    configure(false);
    const response = await get();
    expect(response.status).toBe(403);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns metadata without signing until the learner opens the file", async () => {
    const { sign } = configure(true);
    const response = await get("?metadata");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { fileName: "notes.pdf", byteSize: 100 } });
    expect(sign).not.toHaveBeenCalled();
  });

  it("generates a fresh short-lived signed URL on open", async () => {
    const { sign } = configure(true);
    const response = await get();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://storage.example/private-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(sign).toHaveBeenCalledWith(`${lessonId}/example.pdf`, 60);
  });
});
