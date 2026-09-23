import { LearnerDashboard } from "@/components/learning/LearnerDashboard";
import { paymentReturnStateSchema } from "@/lib/contracts";
import { PublicShell } from "@/components/marketing/PublicShell";
import { requireRole } from "@/lib/auth/guards";
import { measureServerOperation } from "@/lib/observability/server";
import { getLearnerCourseProgress } from "@/lib/progress/queries";

type DashboardPageProps = {
  searchParams: Promise<{ payment?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const viewer = await requireRole("/dashboard", "learner");
  const courses = await measureServerOperation(
    "supabase.learner.dashboard",
    "supabase",
    getLearnerCourseProgress,
  );
  const payment = paymentReturnStateSchema.safeParse((await searchParams).payment);

  if (viewer.role === "learner") {
    return (
      <PublicShell>
        <LearnerDashboard
          courses={courses}
          fullName={viewer.fullName}
          paymentState={payment.success ? payment.data : null}
        />
      </PublicShell>
    );
  }
  return <PublicShell><div className="roleLanding"><h1>مرحبًا {viewer.fullName}</h1><p>ستظهر هنا المواد المسجل فيها وتقدمك الدراسي.</p></div></PublicShell>;
}
