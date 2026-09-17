import { AdminEmptyState, AdminPageHeader, AdminPagination, AdminSection, AdminStatus } from "@/components/admin/AdminPage";
import { AdminCourseActions } from "@/components/admin/AdminMutations";
import styles from "@/components/admin/AdminWorkspace.module.css";
import { courseStatusLabel, formatAdminDate, parseSearchParameters, toSearchString, withPage } from "@/lib/admin/presentation";
import { getAdminCourses } from "@/lib/admin/courses";
import { getAdminView } from "@/lib/admin/view";
import { adminCourseListQuerySchema } from "@/lib/contracts";

type CoursesPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCoursesPage({ searchParams }: CoursesPageProps) {
  const raw = parseSearchParameters(await searchParams);
  const parsed = adminCourseListQuerySchema.safeParse({ ...raw, status: raw.status ?? "in_review" });
  const query = parsed.success ? parsed.data : adminCourseListQuerySchema.parse({ status: "in_review" });
  const { supabase } = await getAdminView("/admin/courses");
  const courses = await getAdminCourses(supabase, query);
  const hrefForPage = (page: number) => `/admin/courses${toSearchString(withPage(query, page))}`;

  return (
    <>
      <AdminPageHeader description="تبدأ هذه القائمة بطابور المراجعة. ستؤكد أي تغيير للحالة قبل إرساله إلى سجل التدقيق." title="مراجعة المقررات" />
      <form action="/admin/courses" className={styles.filter}>
        <label>بحث<input defaultValue={query.search ?? ""} name="search" placeholder="عنوان المقرر أو رمزه أو المدرّس" type="search" /></label>
        <label>الحالة<select defaultValue={query.status ?? "in_review"} name="status"><option value="draft">مسودة</option><option value="in_review">قيد المراجعة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
        <button type="submit">تطبيق المرشحات</button>
      </form>
      <AdminSection description={`${courses.pagination.totalCount} مقررًا مطابقًا للمرشحات الحالية.`} title="المقررات">
        {courses.data.length === 0 ? <AdminEmptyState body="لا توجد مقررات ضمن هذه الحالة أو معايير البحث." title="لا توجد مقررات مطابقة" /> : (
          <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>المقرر</th><th>المدرّس</th><th>الحالة</th><th>آخر نشر</th><th>الإجراءات</th></tr></thead><tbody>{courses.data.map((course) => <tr key={course.id}><td>{course.title}<small><bdi dir="ltr">{course.courseCode ?? course.slug}</bdi></small></td><td>{course.instructorName}</td><td><AdminStatus>{courseStatusLabel[course.status]}</AdminStatus></td><td>{formatAdminDate(course.publishedAt)}</td><td><AdminCourseActions courseId={course.id} courseTitle={course.title} currentStatus={course.status} /></td></tr>)}</tbody></table></div><AdminPagination nextHref={courses.pagination.page < courses.pagination.totalPages ? hrefForPage(courses.pagination.page + 1) : null} page={courses.pagination.page} previousHref={courses.pagination.page > 1 ? hrefForPage(courses.pagination.page - 1) : null} totalPages={courses.pagination.totalPages} /></>
        )}
      </AdminSection>
    </>
  );
}
