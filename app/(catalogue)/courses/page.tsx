import { CourseCard } from "@/components/catalogue/CourseCard";
import { PublicShell } from "@/components/marketing/PublicShell";
import { listPublishedCourses } from "@/lib/catalogue/queries";
import { measureServerOperation } from "@/lib/observability/server";
import { catalog } from "@/lib/copy";
import { isElectricalEngineeringCourse } from "@/lib/catalogue/homepage-subjects";

import styles from "./page.module.css";

export default async function CoursesPage() {
  const courses = await measureServerOperation(
    "supabase.catalogue.list",
    "supabase",
    listPublishedCourses,
  );
  const electricalCourses = courses.filter(isElectricalEngineeringCourse);
  const otherCourses = courses.filter((course) => !isElectricalEngineeringCourse(course));

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
          <>
            {electricalCourses.length > 0 ? (
              <section aria-labelledby="electrical-courses-heading" className="mb-12">
                <h2 id="electrical-courses-heading" className="mb-4 text-2xl font-bold text-ink">{catalog.electricalHeading}</h2>
                <div className={styles.grid}>
                  {electricalCourses.map((course) => <CourseCard key={course.id} course={course} />)}
                </div>
              </section>
            ) : null}
            {otherCourses.length > 0 ? (
              <section aria-label={electricalCourses.length > 0 ? "الدورات الأخرى" : "قائمة الدورات"}>
                {electricalCourses.length > 0 ? <h2 className="mb-4 text-2xl font-bold text-ink">الدورات الأخرى</h2> : null}
                <div className={styles.grid}>
                  {otherCourses.map((course) => <CourseCard key={course.id} course={course} />)}
                </div>
              </section>
            ) : null}
          </>
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
