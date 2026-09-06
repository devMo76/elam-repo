import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/lib/supabase/database.types";

import { getAdminDashboardSummary } from "./reporting";

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
});
