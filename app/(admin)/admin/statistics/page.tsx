import { AdminEmptyState, AdminMetric, AdminMetrics, AdminPageHeader, AdminSection } from "@/components/admin/AdminPage";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { dateInputToIso, formatHalalas, isoToDateInput, parseSearchParameters } from "@/lib/admin/presentation";
import { getAdminDashboardSummary, getAdminRevenueByCourse } from "@/lib/admin/reporting";
import { getAdminView } from "@/lib/admin/view";
import { adminRevenueQuerySchema } from "@/lib/contracts";

type StatisticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminStatisticsPage({ searchParams }: StatisticsPageProps) {
  const raw = parseSearchParameters(await searchParams);
  const parsed = adminRevenueQuerySchema.safeParse({
    ...raw,
    from: dateInputToIso(raw.from, "start"),
    before: dateInputToIso(raw.before, "end"),
  });
  const query = parsed.success ? parsed.data : adminRevenueQuerySchema.parse({});
  const { supabase } = await getAdminView("/admin/statistics");
  const [summary, revenue] = await Promise.all([
    getAdminDashboardSummary(supabase),
    getAdminRevenueByCourse(supabase, query),
  ]);

  return (
    <>
      <AdminPageHeader description="الإيراد المحصّل فقط، موزعًا حسب المقرر. يمكن تضييق الفترة دون تغيير السجل الأصلي." title="الإحصاءات" />
      <form action="/admin/statistics" className={styles.filter}>
        <label>من<input defaultValue={isoToDateInput(query.from)} name="from" type="date" /></label>
        <label>إلى<input defaultValue={isoToDateInput(query.before)} name="before" type="date" /></label>
        <button type="submit">تطبيق الفترة</button>
      </form>
      <AdminMetrics>
        <AdminMetric label="إيراد الفترة" value={<bdi dir="ltr">{formatHalalas(revenue.totalRevenueHalalas)}</bdi>} />
        <AdminMetric label="إجمالي التسجيلات" value={<bdi dir="ltr">{summary.data.enrollmentCount}</bdi>} />
        <AdminMetric label="المقررات النشطة" value={<bdi dir="ltr">{summary.data.activeCourseCount}</bdi>} />
      </AdminMetrics>
      <AdminSection description="لا تشمل هذه القائمة الطلبات المعلّقة أو الفاشلة أو المستردة." title="إيرادات المقررات">
        {revenue.data.length === 0 ? <AdminEmptyState body="لا توجد عمليات دفع محصّلة ضمن هذه الفترة." title="لا توجد إيرادات لعرضها" /> : (
          <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>المقرر</th><th>الطلبات المدفوعة</th><th>الإيراد المحصّل</th></tr></thead><tbody>{revenue.data.map((course) => <tr key={course.courseId}><td>{course.courseTitle}</td><td><bdi dir="ltr">{course.paidOrderCount}</bdi></td><td><bdi dir="ltr">{formatHalalas(course.revenueHalalas)}</bdi></td></tr>)}</tbody></table></div>
        )}
      </AdminSection>
    </>
  );
}
