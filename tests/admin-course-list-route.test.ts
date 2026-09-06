import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/courses", () => ({ getAdminCourses: vi.fn() }));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));

import { GET } from "@/app/api/admin/courses/route";
import { getAdminCourses } from "@/lib/admin/courses";
import { requireAdmin } from "@/lib/auth/authorization";

afterEach(() => vi.clearAllMocks());

describe("admin course list route", () => {
  it("passes validated review filters to the service", async () => {
    const supabase = {};
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase, user: { id: "30000000-0000-4000-8000-000000000001" } } as never);
    vi.mocked(getAdminCourses).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });
    const response = await GET(new Request("http://localhost/api/admin/courses?status=in_review"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getAdminCourses).toHaveBeenCalledWith(supabase, { status: "in_review", page: 1, pageSize: 20 });
  });

  it("rejects invalid filters before the service call", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ authorized: true, supabase: {}, user: { id: "30000000-0000-4000-8000-000000000001" } } as never);
    const response = await GET(new Request("http://localhost/api/admin/courses?status=deleted"));
    expect(response.status).toBe(422);
    expect(getAdminCourses).not.toHaveBeenCalled();
  });
});
