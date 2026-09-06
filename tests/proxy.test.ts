import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hasSupabaseSessionCookie, proxy } from "@/proxy";
import { refreshSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/supabase/proxy", () => ({
  refreshSession: vi.fn(),
}));

describe("proxy authentication refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the remote authentication refresh for logged-out requests", async () => {
    const response = await proxy(new NextRequest("https://example.com/"));

    expect(refreshSession).not.toHaveBeenCalled();
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("refreshes authentication when a Supabase session cookie exists", async () => {
    vi.mocked(refreshSession).mockResolvedValue(NextResponse.next());
    const request = new NextRequest("https://example.com/account", {
      headers: {
        cookie: "sb-project-auth-token.0=session-part",
      },
    });

    const response = await proxy(request);

    expect(hasSupabaseSessionCookie(request)).toBe(true);
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
