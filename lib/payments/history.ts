import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LearnerPurchase = {
  orderId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string | null;
  amountHalalas: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "reversed";
  createdAt: string;
  paidAt: string | null;
  paymentId: string | null;
  receiptStatus: "pending" | "sent" | "failed" | null;
  hasAccess: boolean;
};

export async function getLearnerPurchases(userId: string): Promise<LearnerPurchase[]> {
  const supabase = await createClient();
  // The user's Supabase client enforces orders RLS in addition to this filter.
  const { data: orders, error } = await supabase.from("orders")
    .select("id, course_id, amount_halalas, currency, status, created_at, paid_at, moyasar_payment_id")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error("Learner purchases could not be loaded.");
  if (!orders?.length) return [];

  const courseIds = [...new Set(orders.map((order) => order.course_id))];
  const orderIds = orders.map((order) => order.id);
  const admin = createAdminClient();
  const [courses, receipts, enrollments] = await Promise.all([
    admin.from("courses").select("id, title, slug").in("id", courseIds),
    admin.from("payment_receipts").select("order_id, status").in("order_id", orderIds),
    supabase.from("enrollments").select("course_id").eq("user_id", userId)
      .in("course_id", courseIds).or("expires_at.is.null,expires_at.gt." + new Date().toISOString()),
  ]);
  if (courses.error || receipts.error || enrollments.error) {
    throw new Error("Learner purchase details could not be loaded.");
  }
  const courseById = new Map((courses.data ?? []).map((course) => [course.id, course]));
  const receiptByOrder = new Map((receipts.data ?? []).map((receipt) => [receipt.order_id, receipt.status]));
  const accessibleCourses = new Set((enrollments.data ?? []).map((row) => row.course_id));

  return orders.map((order) => {
    const course = courseById.get(order.course_id);
    return {
      orderId: order.id,
      courseId: order.course_id,
      courseTitle: course?.title ?? "مادة غير متاحة",
      courseSlug: course?.slug ?? null,
      amountHalalas: order.amount_halalas,
      currency: order.currency,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      paymentId: order.moyasar_payment_id,
      receiptStatus: receiptByOrder.get(order.id) ?? null,
      hasAccess: accessibleCourses.has(order.course_id),
    };
  });
}
