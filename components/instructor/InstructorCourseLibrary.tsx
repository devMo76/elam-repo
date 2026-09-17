import Link from "next/link";

import { InstructorEmptyState, InstructorPageHeader, InstructorSection, instructorWorkspaceStyles as styles } from "@/components/instructor/InstructorPage";
import { getInstructorCourses } from "@/components/instructor/instructor-data";
import { getCourseStructureSummary, instructorCourseStatusLabel } from "@/lib/authoring/presentation";
import { getInstructorStatistics } from "@/lib/authoring/statistics";
import { getInstructorView } from "@/lib/authoring/view";

export default async function InstructorCourseLibrary() {
  await getInstructorView("/studio/courses");
  const [courses, statistics] = await Promise.all([getInstructorCourses(), getInstructorStatistics()]);
  const countsByCourseId = new Map(statistics.data.map((item) => [item.courseId, item.enrollmentCount]));

  return (
    <>
      <InstructorPageHeader action={{ href: "/studio/courses/new", label: "إنشاء مقرر" }} description="كل مقرراتك الخاصة، مرتبة من الأحدث. افتح أي مقرر لإكمال محتواه أو متابعة حالته." title="مقرراتي" />
      <InstructorSection description={`${courses.length} مقررًا في استوديوك.`} title="المكتبة">
        {courses.length === 0 ? (
          <InstructorEmptyState action={{ href: "/studio/courses/new", label: "إنشاء مقرر" }} body="ستظهر مسوداتك ومقرراتك المنشورة هنا. أنشئ المقرر أولًا ثم أضف محتواه تدريجيًا." title="لا توجد مقررات بعد" />
        ) : (
          <div className={styles.courseList}>
            {courses.map((course) => {
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
