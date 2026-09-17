import Link from "next/link";

import { getInstructorCourses } from "@/components/instructor/instructor-data";
import { InstructorEmptyState, InstructorPageHeader, InstructorSection, instructorWorkspaceStyles as styles } from "@/components/instructor/InstructorPage";
import { getCourseStructureSummary, instructorCourseStatusLabel } from "@/lib/authoring/presentation";
import { getInstructorStatistics } from "@/lib/authoring/statistics";
import { getInstructorView } from "@/lib/authoring/view";

export default async function InstructorDashboard() {
  const { viewer } = await getInstructorView("/studio");
  const [courses, statistics] = await Promise.all([getInstructorCourses(), getInstructorStatistics()]);
  const countsByCourseId = new Map(statistics.data.map((item) => [item.courseId, item.enrollmentCount]));
  const draftCount = courses.filter((course) => course.status === "draft").length;
  const publishedCount = courses.filter((course) => course.status === "published").length;

  return (
    <>
      <InstructorPageHeader
        action={{ href: "/studio/courses/new", label: "إنشاء مقرر" }}
        description="ابدأ من المقرر الذي تعمل عليه الآن، ثم أكمل المحتوى وأرسله للمراجعة عندما يصبح جاهزًا."
        title={`مرحبًا، ${viewer.fullName}`}
      />
      <section aria-label="ملخص الاستوديو" className={styles.snapshot}>
        <div><span>كل المقررات</span><strong><bdi dir="ltr">{courses.length}</bdi></strong></div>
        <div><span>مسودات تحتاج متابعة</span><strong><bdi dir="ltr">{draftCount}</bdi></strong></div>
        <div><span>مقررات منشورة</span><strong><bdi dir="ltr">{publishedCount}</bdi></strong></div>
      </section>
      <InstructorSection
        action={{ href: "/studio/courses", label: "عرض كل المقررات" }}
        description="اختر مقررًا للمتابعة؛ كل حالة ومحتوى ظاهر من سجلّك الفعلي."
        title="متابعة التأليف"
      >
        {courses.length === 0 ? (
          <InstructorEmptyState action={{ href: "/studio/courses/new", label: "إنشاء أول مقرر" }} body="لم تُنشئ أي مقرر بعد. ابدأ بمعلوماته الأساسية، ثم أضف الوحدات والدروس من مساحة عمل واحدة." title="ابدأ بمقرر جديد" />
        ) : (
          <div className={styles.courseList}>
            {courses.slice(0, 5).map((course) => {
              const structure = getCourseStructureSummary(course);
              const enrolments = countsByCourseId.get(course.id) ?? 0;

              return (
                <article className={styles.courseRow} key={course.id}>
                  <Link className={styles.courseTitle} href={`/studio/courses/${course.id}`}>
                    <strong>{course.title}</strong>
                    <small><bdi dir="ltr">{course.courseCode ?? course.slug}</bdi></small>
                  </Link>
                  <span className={styles.status}>{instructorCourseStatusLabel[course.status]}</span>
                  <span className={styles.courseMeta}>
                    {structure.moduleCount} وحدات · {structure.lessonCount} دروس · {structure.readyLessonCount} فيديوهات جاهزة · {enrolments} تسجيلات
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </InstructorSection>
    </>
  );
}
