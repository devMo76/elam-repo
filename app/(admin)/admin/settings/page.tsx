import { AdminEmptyState, AdminPageHeader, AdminPagination, AdminSection, AdminStatus } from "@/components/admin/AdminPage";
import { AdminSettingsForm } from "@/components/admin/AdminMutations";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { formatAdminDate, parseSearchParameters, toSearchString, withPage } from "@/lib/admin/presentation";
import { getAdminAuditHistory } from "@/lib/admin/directory";
import { getAdminPlatformSettings } from "@/lib/admin/settings";
import { getAdminView } from "@/lib/admin/view";
import { adminAuditListQuerySchema } from "@/lib/contracts";

type SettingsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminSettingsPage({ searchParams }: SettingsPageProps) {
  const raw = parseSearchParameters(await searchParams);
  const parsed = adminAuditListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminAuditListQuerySchema.parse({});
  const { supabase } = await getAdminView("/admin/settings");
  const [settings, audit] = await Promise.all([
    getAdminPlatformSettings(supabase),
    getAdminAuditHistory(supabase, query),
  ]);
  const hrefForPage = (page: number) => `/admin/settings${toSearchString(withPage(query, page))}`;

  return (
    <>
      <AdminPageHeader description="إعدادات تشغيليّة محدودة وسجل تغييرات للقراءة فقط. لا يمكن حذف السجل أو تعديله من الواجهة." title="الإعدادات والسجل" />
      <AdminSection description={`آخر تحديث: ${formatAdminDate(settings.updatedAt)}.`} title="سياسة النشر">
        <AdminSettingsForm initialValue={settings.instructorDirectPublish} />
      </AdminSection>
      <AdminSection description="يعرض السجل تغيير الأدوار وحالات المقررات والإعدادات، حسب المرشح الحالي." title="سجل التدقيق">
        <form action="/admin/settings" className={styles.filter}>
          <label>الإجراء<input defaultValue={query.action ?? ""} name="action" placeholder="مثال: course.publish" type="search" /></label>
          <button type="submit">تطبيق المرشح</button>
        </form>
        {audit.data.length === 0 ? <AdminEmptyState body="لا توجد عمليات تطابق هذا المرشح بعد." title="لا توجد أحداث في السجل" /> : (
          <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>التاريخ</th><th>المنفّذ</th><th>الإجراء</th><th>الهدف</th></tr></thead><tbody>{audit.data.map((entry) => <tr key={entry.id}><td>{formatAdminDate(entry.createdAt)}</td><td>{entry.actorName ?? "النظام"}</td><td><AdminStatus><bdi dir="ltr">{entry.action}</bdi></AdminStatus></td><td><bdi dir="ltr">{entry.subject ?? "—"}</bdi></td></tr>)}</tbody></table></div><AdminPagination nextHref={audit.pagination.page < audit.pagination.totalPages ? hrefForPage(audit.pagination.page + 1) : null} page={audit.pagination.page} previousHref={audit.pagination.page > 1 ? hrefForPage(audit.pagination.page - 1) : null} totalPages={audit.pagination.totalPages} /></>
        )}
      </AdminSection>
    </>
  );
}
