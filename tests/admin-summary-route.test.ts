import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/reporting", () => ({
  getAdminDashboardSummary: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({
  requireAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/summary/route";
import { getAdminDashboardSummary } from "@/lib/admin/reporting";
import { requireAdmin } from "@/lib/auth/authorization";

afterEach(() => vi.clearAllMocks());

describe("admin summary route", () => {
  it("returns an uncached summary for an administrator", async () => {
    const supabase = { rpc: vi.fn() };
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      supabase,
      user: { id: "30000000-0000-4000-8000-000000000001" },
    } as never);
    vi.mocked(getAdminDashboardSummary).mockResolvedValue({
      data: {
        totalRevenueHalalas: 35000,
        enrollmentCount: 1,
        activeCourseCount: 1,
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getAdminDashboardSummary).toHaveBeenCalledWith(supabase);
    await expect(response.json()).resolves.toEqual({
      data: {
        totalRevenueHalalas: 35000,
        enrollmentCount: 1,
        activeCourseCount: 1,
      },
    });
  });

  it("returns the authorization response for a non-admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: "forbidden", message: "Administrator role required." } },
        { status: 403 },
      ),
    } as never);

    const response = await GET();

    expect(response.status).toBe(403);
    expect(getAdminDashboardSummary).not.toHaveBeenCalled();
  });

  it("does not expose database errors", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: true,
      supabase: {},
      user: { id: "30000000-0000-4000-8000-000000000001" },
    } as never);
    vi.mocked(getAdminDashboardSummary).mockRejectedValue(
      new Error("internal database details"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "admin_summary_failed",
        message: "The administration summary could not be loaded.",
      },
    });
  });
});
