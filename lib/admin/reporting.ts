import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  adminDashboardSummaryResponseSchema,
  adminPurchaseHistoryResponseSchema,
  adminRevenueResponseSchema,
} from "@/lib/contracts";
import type {
  AdminPurchaseHistoryQuery,
  AdminRevenueQuery,
} from "@/lib/contracts";
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

export async function getAdminPurchaseHistory(
  supabase: SupabaseClient<Database>,
  query: AdminPurchaseHistoryQuery,
) {
  const { data, error } = await supabase.rpc("admin_purchase_history", {
    search_query: query.search,
    filter_status: query.status,
    created_from: query.from,
    created_before: query.before,
    page_size: query.pageSize,
    page_offset: (query.page - 1) * query.pageSize,
  });

  if (error || !data) {
    throw new Error("Admin purchase history could not be loaded.");
  }

  const totalCount = data[0]?.total_count ?? 0;

  return adminPurchaseHistoryResponseSchema.parse({
    data: data.map((purchase) => ({
      id: purchase.order_id,
      learnerName: purchase.learner_name,
      learnerEmail: purchase.learner_email,
      courseId: purchase.course_id,
      courseTitle: purchase.course_title,
      amountHalalas: purchase.amount_halalas,
      currency: purchase.currency,
      status: purchase.order_status,
      createdAt: purchase.created_at,
      paidAt: purchase.paid_at,
      refundedAt: purchase.refunded_at,
      reversedAt: purchase.reversed_at,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  });
}

export async function getAdminRevenueByCourse(
  supabase: SupabaseClient<Database>,
  query: AdminRevenueQuery,
) {
  const { data, error } = await supabase.rpc("admin_revenue_by_course", {
    paid_from: query.from,
    paid_before: query.before,
  });

  if (error || !data) {
    throw new Error("Admin revenue report could not be loaded.");
  }

  const rows = data.map((course) => ({
    courseId: course.course_id,
    courseTitle: course.course_title,
    revenueHalalas: course.revenue_halalas,
    paidOrderCount: course.paid_order_count,
  }));

  return adminRevenueResponseSchema.parse({
    data: rows,
    totalRevenueHalalas: rows.reduce(
      (total, course) => total + course.revenueHalalas,
      0,
    ),
  });
}
