import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/reporting", () => ({
  getAdminPurchaseHistory: vi.fn(),
  getAdminRevenueByCourse: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requireAdmin: vi.fn() }));

import { GET as getOrders } from "@/app/api/admin/orders/route";
import { GET as getRevenue } from "@/app/api/admin/revenue/route";
import {
  getAdminPurchaseHistory,
  getAdminRevenueByCourse,
} from "@/lib/admin/reporting";
import { requireAdmin } from "@/lib/auth/authorization";

afterEach(() => vi.clearAllMocks());

function authorizeAdmin() {
  const supabase = {};
  vi.mocked(requireAdmin).mockResolvedValue({
    authorized: true,
    supabase,
    user: { id: "30000000-0000-4000-8000-000000000001" },
  } as never);
  return supabase;
}

describe("admin reporting routes", () => {
  it("passes validated purchase filters to the service", async () => {
    const supabase = authorizeAdmin();
    vi.mocked(getAdminPurchaseHistory).mockResolvedValue({
      data: [],
      pagination: { page: 2, pageSize: 10, totalCount: 0, totalPages: 0 },
    });

    const response = await getOrders(
      new Request("http://localhost/api/admin/orders?status=paid&page=2&pageSize=10"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getAdminPurchaseHistory).toHaveBeenCalledWith(supabase, {
      status: "paid",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects invalid purchase filters before database access", async () => {
    authorizeAdmin();
    const response = await getOrders(
      new Request("http://localhost/api/admin/orders?pageSize=1000"),
    );
    expect(response.status).toBe(422);
    expect(getAdminPurchaseHistory).not.toHaveBeenCalled();
  });

  it("passes a validated revenue date range to the service", async () => {
    const supabase = authorizeAdmin();
    vi.mocked(getAdminRevenueByCourse).mockResolvedValue({
      data: [],
      totalRevenueHalalas: 0,
    });
    const from = "2026-01-01T00:00:00Z";
    const before = "2026-02-01T00:00:00Z";
    const response = await getRevenue(
      new Request(`http://localhost/api/admin/revenue?from=${from}&before=${before}`),
    );
    expect(response.status).toBe(200);
    expect(getAdminRevenueByCourse).toHaveBeenCalledWith(supabase, { from, before });
  });

  it("rejects reversed revenue date ranges", async () => {
    authorizeAdmin();
    const response = await getRevenue(
      new Request(
        "http://localhost/api/admin/revenue?from=2026-02-01T00:00:00Z&before=2026-01-01T00:00:00Z",
      ),
    );
    expect(response.status).toBe(422);
    expect(getAdminRevenueByCourse).not.toHaveBeenCalled();
  });
});
