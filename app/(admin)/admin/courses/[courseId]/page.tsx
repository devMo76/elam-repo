import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminCourseReviewContent } from "@/components/admin/AdminCourseReviewContent";
import { AdminCourseActions } from "@/components/admin/AdminMutations";
import { AdminPageHeader, AdminSection, AdminStatus } from "@/components/admin/AdminPage";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { getAdminView } from "@/lib/admin/view";
import { getAdminCourseReview } from "@/lib/admin/course-review";
import { courseStatusLabel } from "@/lib/admin/presentation";
import { evaluateCourseReadiness } from "@/lib/authoring/readiness";

export default async function AdminCourseReviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase } = await getAdminView(`/admin/courses/${courseId}`);
  if (!z.uuid().safeParse(courseId).success) notFound();
  const review = await getAdminCourseReview(supabase, courseId);
  if (!review) notFound();
  const { course, instructorName } = review;
  const readiness = evaluateCourseReadiness({ course });

  return <>
    <Link className={styles.quietButton} href="/admin/courses">العودة إلى مراجعة الدورات</Link>
    <AdminPageHeader title={course.title} description={`الشارح: ${instructorName} · ${course.department}`} />
    <AdminSection title="تفاصيل الدورة">
      <AdminStatus>{courseStatusLabel[course.status]}</AdminStatus>
      {course.subtitle ? <p>{course.subtitle}</p> : null}
      {course.description ? <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{course.description}</p> : <p>لا يوجد وصف للدورة.</p>}
      <p>{new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(course.priceHalalas / 100)}</p>
    </AdminSection>
    <AdminSection title="مراجعة المحتوى" description="شاهد الدروس وافتح الملفات المرفقة قبل اتخاذ قرار النشر.">
      <AdminCourseReviewContent course={course} />
    </AdminSection>
    <AdminSection title="قرار المراجعة">
      <AdminCourseActions canPublish={readiness.canSubmit} courseId={course.id} courseTitle={course.title}
        currentStatus={course.status} publishedEditsAllowed={course.publishedEditsAllowed} showReviewLink={false} />
    </AdminSection>
  </>;
}
