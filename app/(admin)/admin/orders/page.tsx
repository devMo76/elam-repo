import { AdminEmptyState, AdminPageHeader, AdminPagination, AdminSection, AdminStatus } from "@/components/admin/AdminPage";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { dateInputToIso, formatAdminDate, formatHalalas, isoToDateInput, orderStatusLabel, parseSearchParameters, toSearchString, withPage } from "@/lib/admin/presentation";
import { getAdminPurchaseHistory } from "@/lib/admin/reporting";
import { getAdminView } from "@/lib/admin/view";
import { adminPurchaseHistoryQuerySchema } from "@/lib/contracts";

type OrdersPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const raw = parseSearchParameters(await searchParams);
  const parsed = adminPurchaseHistoryQuerySchema.safeParse({
    ...raw,
    from: dateInputToIso(raw.from, "start"),
    before: dateInputToIso(raw.before, "end"),
  });
  const query = parsed.success ? parsed.data : adminPurchaseHistoryQuerySchema.parse({});
  const { supabase } = await getAdminView("/admin/orders");
  const purchases = await getAdminPurchaseHistory(supabase, query);
  const hrefForPage = (page: number) => `/admin/orders${toSearchString({ ...withPage(query, page), from: isoToDateInput(query.from), before: isoToDateInput(query.before) })}`;

  return (
    <>
      <AdminPageHeader description="سجل تشغيلي للطلبات. القراءة فقط؛ لا تتضمن المنصة إجراء استرداد أو حذف للطلبات." title="الطلبات والإيرادات" />
      <form action="/admin/orders" className={styles.filter}>
        <label>بحث<input defaultValue={query.search ?? ""} name="search" placeholder="اسم المتعلم أو البريد أو المقرر" type="search" /></label>
        <label>الحالة<select defaultValue={query.status ?? ""} name="status"><option value="">كل الحالات</option><option value="pending">قيد الانتظار</option><option value="paid">مدفوع</option><option value="failed">فشل</option><option value="refunded">مسترد</option><option value="reversed">معكوس</option></select></label>
        <label>من<input defaultValue={isoToDateInput(query.from)} name="from" type="date" /></label>
        <label>إلى<input defaultValue={isoToDateInput(query.before)} name="before" type="date" /></label>
        <button type="submit">تطبيق المرشحات</button>
      </form>
      <AdminSection description={`${purchases.pagination.totalCount} طلبًا مطابقًا للمرشحات الحالية.`} title="سجل الشراء">
        {purchases.data.length === 0 ? <AdminEmptyState body="جرّب إزالة بعض المرشحات أو عد لاحقًا عند وصول طلبات جديدة." title="لا توجد طلبات مطابقة" /> : (
          <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>المتعلم</th><th>المقرر</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الإنشاء</th></tr></thead><tbody>{purchases.data.map((purchase) => <tr key={purchase.id}><td>{purchase.learnerName}<small dir="ltr">{purchase.learnerEmail}</small></td><td>{purchase.courseTitle}</td><td><bdi dir="ltr">{formatHalalas(purchase.amountHalalas)}</bdi></td><td><AdminStatus>{orderStatusLabel[purchase.status]}</AdminStatus></td><td>{formatAdminDate(purchase.createdAt)}</td></tr>)}</tbody></table></div><AdminPagination nextHref={purchases.pagination.page < purchases.pagination.totalPages ? hrefForPage(purchases.pagination.page + 1) : null} page={purchases.pagination.page} previousHref={purchases.pagination.page > 1 ? hrefForPage(purchases.pagination.page - 1) : null} totalPages={purchases.pagination.totalPages} /></>
        )}
      </AdminSection>
    </>
  );
}
