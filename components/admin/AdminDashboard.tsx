import Link from "next/link";

import { AdminMetric, AdminMetrics, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { formatHalalas } from "@/lib/admin/presentation";
import { getAdminDashboardSummary } from "@/lib/admin/reporting";
import { getAdminView } from "@/lib/admin/view";

export default async function AdminDashboard() {
  const { supabase } = await getAdminView("/admin");
  const { data: summary } = await getAdminDashboardSummary(supabase);

  return (
    <>
      <AdminPageHeader
        description="ملخص مباشر للمؤشرات التشغيلية في المنصة. تُحدَّث الأرقام من السجل المعتمد فقط."
        title="نظرة عامة"
      />
      <AdminMetrics>
        <AdminMetric label="إجمالي الإيرادات المحصّلة" value={<bdi dir="ltr">{formatHalalas(summary.totalRevenueHalalas)}</bdi>} />
        <AdminMetric label="إجمالي التسجيلات" value={<bdi dir="ltr">{summary.enrollmentCount}</bdi>} />
        <AdminMetric label="المقررات النشطة" value={<bdi dir="ltr">{summary.activeCourseCount}</bdi>} />
      </AdminMetrics>
      <AdminSection description="انتقل إلى مساحة العمل المناسبة؛ لا توجد إجراءات حسّاسة في هذه الشاشة." title="إدارة المنصة">
        <div className={styles.links}>
          <Link className={styles.link} href="/admin/statistics"><strong>الإحصاءات</strong><span>إيرادات المقررات ضمن فترة زمنية محددة.</span></Link>
          <Link className={styles.link} href="/admin/orders"><strong>الطلبات</strong><span>البحث في سجل الشراء وحالات الدفع.</span></Link>
          <Link className={styles.link} href="/admin/courses"><strong>مراجعة المقررات</strong><span>نشر المقررات أو إعادتها للمسودة أو أرشفتها.</span></Link>
          <Link className={styles.link} href="/admin/users"><strong>المستخدمون</strong><span>إدارة أدوار الحسابات مع سجل تدقيق.</span></Link>
          <Link className={styles.link} href="/admin/settings"><strong>الإعدادات والسجل</strong><span>سياسة النشر المباشر وسجل التغييرات.</span></Link>
        </div>
      </AdminSection>
    </>
  );
}
