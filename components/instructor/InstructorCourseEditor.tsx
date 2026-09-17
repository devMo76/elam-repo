import { InstructorCurriculumBuilder } from "./InstructorCurriculumBuilder";
import { InstructorCourseDetailsForm } from "./InstructorCourseForms";
import { InstructorPageHeader, InstructorSection, instructorWorkspaceStyles as styles } from "./InstructorPage";
import { InstructorPublicationActions } from "./InstructorPublicationActions";
import type { StudioCourse } from "./studio-types";
import { getCourseStructureSummary, instructorCourseStatusLabel } from "@/lib/authoring/presentation";

export function InstructorCourseEditor({ course }: { course: StudioCourse }) {
  const structure = getCourseStructureSummary(course);

  return (
    <>
      <InstructorPageHeader
        action={{ href: "/studio/courses", label: "العودة إلى مقرراتي" }}
        description={`${course.department}${course.courseCode ? ` · ${course.courseCode}` : ""}`}
        title={course.title}
      />
      <section aria-label="حالة المقرر" className={styles.snapshot}>
        <div><span>الحالة</span><strong className={styles.status}>{instructorCourseStatusLabel[course.status]}</strong></div>
        <div><span>الوحدات</span><strong><bdi dir="ltr">{structure.moduleCount}</bdi></strong></div>
        <div><span>الدروس الجاهزة</span><strong><bdi dir="ltr">{structure.readyLessonCount} / {structure.lessonCount}</bdi></strong></div>
      </section>
      <nav aria-label="أقسام المقرر" className={styles.editorNav}>
        <a href="#curriculum">المحتوى</a>
        <a href="#course-details">تفاصيل المقرر</a>
        <a href="#publication">النشر</a>
      </nav>
      <InstructorSection id="curriculum" title="المحتوى والفيديوهات">
        <InstructorCurriculumBuilder courseId={course.id} editable={course.status === "draft"} initialModules={course.modules} />
      </InstructorSection>
      <section className={styles.section} id="course-details">
        <details className={styles.courseDetails}>
          <summary>
            <span>تفاصيل المقرر</span>
            <small>العنوان والوصف والسعر وصورة الغلاف</small>
          </summary>
          <div className={styles.courseDetailsBody}>
            <InstructorCourseDetailsForm course={course} />
          </div>
        </details>
      </section>
      <InstructorSection id="publication" title="الإرسال والنشر">
        <InstructorPublicationActions course={course} />
      </InstructorSection>
    </>
  );
}
