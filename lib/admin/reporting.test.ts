import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/lib/supabase/database.types";

import {
  getAdminDashboardSummary,
  getAdminPurchaseHistory,
  getAdminRevenueByCourse,
} from "./reporting";

function createSupabaseMock(result: unknown) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient<Database>;
}

describe("admin reporting", () => {
  it("maps database names to the public API contract", async () => {
    const supabase = createSupabaseMock({
      data: [
        {
          total_revenue_halalas: 35000,
          enrollment_count: 12,
          active_course_count: 3,
        },
      ],
      error: null,
    });

    await expect(getAdminDashboardSummary(supabase)).resolves.toEqual({
      data: {
        totalRevenueHalalas: 35000,
        enrollmentCount: 12,
        activeCourseCount: 3,
      },
    });
  });

  it("fails closed when the database result is unavailable", async () => {
    const supabase = createSupabaseMock({
      data: null,
      error: { code: "42501" },
    });

    await expect(getAdminDashboardSummary(supabase)).rejects.toThrow(
      "Admin dashboard summary could not be loaded.",
    );
  });

  it("maps paginated purchase history without provider payloads", async () => {
    const supabase = createSupabaseMock({
      data: [{
        order_id: "70000000-0000-4000-8000-000000000001",
        learner_name: "Learner One",
        learner_email: "learner@example.invalid",
        course_id: "40000000-0000-4000-8000-000000000001",
        course_title: "Signals and Systems",
        amount_halalas: 35000,
        currency: "SAR",
        order_status: "paid",
        created_at: "2026-01-11T08:00:00+00:00",
        paid_at: "2026-01-11T08:02:00+00:00",
        refunded_at: null,
        reversed_at: null,
        total_count: 21,
      }],
      error: null,
    });

    const response = await getAdminPurchaseHistory(supabase, {
      page: 2,
      pageSize: 20,
    });

    expect(response.pagination).toEqual({ page: 2, pageSize: 20, totalCount: 21, totalPages: 2 });
    expect(response.data[0]).toMatchObject({ learnerName: "Learner One", status: "paid" });
    expect(JSON.stringify(response)).not.toContain("raw_payload");
  });

  it("calculates the total of per-course revenue rows", async () => {
    const supabase = createSupabaseMock({
      data: [{
        course_id: "40000000-0000-4000-8000-000000000001",
        course_title: "Signals and Systems",
        revenue_halalas: 35000,
        paid_order_count: 1,
      }],
      error: null,
    });

    await expect(getAdminRevenueByCourse(supabase, {})).resolves.toMatchObject({
      totalRevenueHalalas: 35000,
      data: [{ revenueHalalas: 35000, paidOrderCount: 1 }],
    });
  });
});
