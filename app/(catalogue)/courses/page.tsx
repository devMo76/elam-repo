import { CourseCard } from "@/components/catalogue/CourseCard";
import { PublicShell } from "@/components/marketing/PublicShell";
import { listPublishedCourses } from "@/lib/catalogue/queries";

import styles from "./page.module.css";

export default async function CoursesPage() {
  const courses = await listPublishedCourses();

  return (
    <PublicShell>
      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>المواد المتوفرة</h1>
          <p>
            اختر المادة المناسبة، واستعرض منهجها والدروس المتاحة قبل أن تبدأ.
          </p>
        </header>

        {courses.length > 0 ? (
          <section className={styles.grid} aria-label="قائمة المواد">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </section>
        ) : (
          <section className={styles.empty}>
            <h2>ما فيه مواد منشورة الآن</h2>
            <p>نعمل على تجهيز المحتوى، فارجع لنا قريبًا.</p>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
