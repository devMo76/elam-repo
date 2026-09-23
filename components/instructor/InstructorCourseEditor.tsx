"use client";

import { useMemo, useState } from "react";

import { InstructorCurriculumBuilder } from "./InstructorCurriculumBuilder";
import { InstructorCourseDetailsForm } from "./InstructorCourseForms";
import { InstructorPageHeader, InstructorSection, instructorWorkspaceStyles as styles } from "./InstructorPage";
import { InstructorPublicationActions } from "./InstructorPublicationActions";
import type { StudioCourse } from "./studio-types";
import { evaluateCourseReadiness } from "@/lib/authoring/readiness";
import type { InstructorPublishingCapability } from "@/lib/authoring/capabilities";
import { getCourseStructureSummary, instructorCourseStatusLabel } from "@/lib/authoring/presentation";

export function InstructorCourseEditor({
  course: initialCourse,
  publishingCapability,
}: {
  course: StudioCourse;
  publishingCapability: InstructorPublishingCapability;
}) {
  const [course, setCourse] = useState(initialCourse);
  const structure = getCourseStructureSummary(course);
  const readiness = useMemo(() => evaluateCourseReadiness({ course }), [course]);

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
        <InstructorCurriculumBuilder
          courseId={course.id}
          courseTitle={course.title}
          editable={course.status === "draft"}
          modules={course.modules}
          onModulesChange={(next) => setCourse((current) => ({
            ...current,
            modules: typeof next === "function" ? next(current.modules) : next,
          }))}
        />
      </InstructorSection>
      <section className={styles.section} id="course-details">
        <details className={styles.courseDetails}>
          <summary>
            <span>تفاصيل المقرر</span>
            <small>العنوان والوصف والسعر وصورة الغلاف</small>
          </summary>
          <div className={styles.courseDetailsBody}>
            <InstructorCourseDetailsForm
              course={course}
              onSaved={(savedCourse) => setCourse((current) => ({ ...savedCourse, modules: current.modules }))}
            />
          </div>
        </details>
      </section>
      <InstructorSection id="publication" title="الإرسال والنشر">
        <InstructorPublicationActions
          capability={publishingCapability}
          course={course}
          onStatusChange={(status) => setCourse((current) => ({ ...current, status }))}
          readiness={readiness}
        />
      </InstructorSection>
    </>
  );
}
