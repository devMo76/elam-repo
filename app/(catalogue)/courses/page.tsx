import { CourseCard } from "@/components/catalogue/CourseCard";
import { PublicShell } from "@/components/marketing/PublicShell";
import { listPublishedCourses } from "@/lib/catalogue/queries";
import { measureServerOperation } from "@/lib/observability/server";

import styles from "./page.module.css";

export default async function CoursesPage() {
  const courses = await measureServerOperation(
    "supabase.catalogue.list",
    "supabase",
    listPublishedCourses,
  );

  return (
    <PublicShell>
      <div className={styles.main}>
        <header className={styles.intro}>
          <h1>الدورات المتوفرة</h1>
          <p>
            اختر الدورة المناسبة، واستعرض منهجها والدروس المتاحة قبل أن تبدأ.
          </p>
        </header>

        {courses.length > 0 ? (
          <section className={styles.grid} aria-label="قائمة الدورات">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </section>
        ) : (
          <section className={styles.empty}>
            <h2>ما فيه دورات منشورة الآن</h2>
            <p>نعمل على تجهيز المحتوى، فارجع لنا قريبًا.</p>
          </section>
        )}
      </div>
    </PublicShell>
  );
}
