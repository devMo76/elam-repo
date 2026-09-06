import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminDashboardSummaryResponseSchema } from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";

export async function getAdminDashboardSummary(
  supabase: SupabaseClient<Database>,
) {
  const { data, error } = await supabase.rpc("admin_dashboard_summary");

  if (error || data.length !== 1) {
    throw new Error("Admin dashboard summary could not be loaded.");
  }

  const summary = data[0];

  return adminDashboardSummaryResponseSchema.parse({
    data: {
      totalRevenueHalalas: summary.total_revenue_halalas,
      enrollmentCount: summary.enrollment_count,
      activeCourseCount: summary.active_course_count,
    },
  });
}
