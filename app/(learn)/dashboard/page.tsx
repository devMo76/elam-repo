import { LearnerDashboard } from "@/components/learning/LearnerDashboard";
import { paymentReturnStateSchema } from "@/lib/contracts";
import { PublicShell } from "@/components/marketing/PublicShell";
import { requireRole } from "@/lib/auth/guards";
import { measureServerOperation } from "@/lib/observability/server";
import { getLearnerCourseProgress } from "@/lib/progress/queries";
import { getLearnerPurchases } from "@/lib/payments/history";
import { z } from "zod";

type DashboardPageProps = {
  searchParams: Promise<{ payment?: string; payment_id?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const viewer = await requireRole("/dashboard", "learner");
  const [courses, purchases, query] = await Promise.all([
    measureServerOperation("supabase.learner.dashboard", "supabase", getLearnerCourseProgress),
    measureServerOperation("supabase.learner.purchases", "supabase", () => getLearnerPurchases(viewer.id)),
    searchParams,
  ]);
  const payment = paymentReturnStateSchema.safeParse(query.payment);
  const returnPaymentId = z.uuid().safeParse(query.payment_id);

  if (viewer.role === "learner") {
    return (
      <PublicShell>
        <LearnerDashboard
          courses={courses}
          fullName={viewer.fullName}
          paymentState={payment.success ? payment.data : null}
          purchases={purchases}
          returnPaymentId={returnPaymentId.success ? returnPaymentId.data : null}
        />
      </PublicShell>
    );
  }
  return <PublicShell><div className="roleLanding"><h1>مرحبًا {viewer.fullName}</h1><p>ستظهر هنا المواد المسجل فيها وتقدمك الدراسي.</p></div></PublicShell>;
}
