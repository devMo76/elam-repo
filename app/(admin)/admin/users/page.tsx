import { AdminEmptyState, AdminPageHeader, AdminPagination, AdminSection, AdminStatus } from "@/components/admin/AdminPage";
import { AdminRoleControl } from "@/components/admin/AdminMutations";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { formatAdminDate, parseSearchParameters, roleLabel, toSearchString, withPage } from "@/lib/admin/presentation";
import { getAdminUsers } from "@/lib/admin/directory";
import { getAdminView } from "@/lib/admin/view";
import { adminUserListQuerySchema } from "@/lib/contracts";

type UsersPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const raw = parseSearchParameters(await searchParams);
  const parsed = adminUserListQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : adminUserListQuerySchema.parse({});
  const { supabase } = await getAdminView("/admin/users");
  const users = await getAdminUsers(supabase, query);
  const hrefForPage = (page: number) => `/admin/users${toSearchString(withPage(query, page))}`;

  return (
    <>
      <AdminPageHeader description="غيّر دور حساب عند الحاجة فقط. يمنع النظام تغيير دور المسؤول الحالي ويُسجّل كل تعديل." title="المستخدمون" />
      <form action="/admin/users" className={styles.filter}>
        <label>بحث<input defaultValue={query.search ?? ""} name="search" placeholder="الاسم أو البريد الإلكتروني" type="search" /></label>
        <label>الدور<select defaultValue={query.role ?? ""} name="role"><option value="">كل الأدوار</option><option value="learner">متعلم</option><option value="instructor">مدرّس</option><option value="admin">مسؤول</option></select></label>
        <button type="submit">تطبيق المرشحات</button>
      </form>
      <AdminSection description={`${users.pagination.totalCount} حسابًا مطابقًا للمرشحات الحالية.`} title="دليل الحسابات">
        {users.data.length === 0 ? <AdminEmptyState body="جرّب إزالة بعض المرشحات أو ابحث باسم أو بريد آخر." title="لا توجد حسابات مطابقة" /> : (
          <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>المستخدم</th><th>الدور الحالي</th><th>تاريخ الإنشاء</th><th>تغيير الدور</th></tr></thead><tbody>{users.data.map((user) => <tr key={user.id}><td><div className={styles.userIdentity}><strong>{user.fullName}</strong><bdi className={styles.userEmail} dir="ltr" title={user.email}>{user.email}</bdi></div></td><td><AdminStatus>{roleLabel[user.role]}</AdminStatus></td><td>{formatAdminDate(user.createdAt)}</td><td><AdminRoleControl currentRole={user.role} userId={user.id} userName={user.fullName} /></td></tr>)}</tbody></table></div><AdminPagination nextHref={users.pagination.page < users.pagination.totalPages ? hrefForPage(users.pagination.page + 1) : null} page={users.pagination.page} previousHref={users.pagination.page > 1 ? hrefForPage(users.pagination.page - 1) : null} totalPages={users.pagination.totalPages} /></>
        )}
      </AdminSection>
    </>
  );
}
