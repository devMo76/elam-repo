"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InstructorCurriculumBuilder } from "./InstructorCurriculumBuilder";
import { InstructorCourseDetailsForm } from "./InstructorCourseForms";
import { InstructorPageHeader, instructorWorkspaceStyles as styles } from "./InstructorPage";
import { InstructorPublicationActions } from "./InstructorPublicationActions";
import { StudioDialog } from "./StudioDialog";
import { useInstructorNavigationBlocker } from "./InstructorNavigationBlocker";
import type { StudioCourse } from "./studio-types";
import { evaluateCourseReadiness } from "@/lib/authoring/readiness";
import { getInstructorEditPolicy } from "@/lib/authoring/edit-policy";
import type { InstructorPublishingCapability } from "@/lib/authoring/capabilities";
import { getCourseStructureSummary, instructorCourseStatusLabel } from "@/lib/authoring/presentation";
import { useInstructorUploads } from "./InstructorUploadManager";
import { formatArabicLessonCount } from "@/lib/catalogue/presentation";

const panels = { content: "المحتوى", details: "تفاصيل الدورة", publication: "النشر" } as const;
type Panel = keyof typeof panels;

export function InstructorCourseEditor({ course: initialCourse, publishingCapability }: {
  course: StudioCourse; publishingCapability: InstructorPublishingCapability;
}) {
  const [course, setCourse] = useState(initialCourse);
  const search = useSearchParams();
  const [panel, setPanel] = useState<Panel | null>(() => search.get("panel") === "content" ? "content" : null);
  const { isBusy } = useInstructorNavigationBlocker();
  const { uploads } = useInstructorUploads();
  const videoActivity = Object.values(uploads).filter((upload) => upload.isPreparing || upload.isClientUpload || ["uploading", "processing"].includes(upload.mediaStatus));
  useEffect(() => {
    const openLesson = (event: Event) => {
      if ((event as CustomEvent<{ courseId: string }>).detail.courseId === course.id) setPanel("content");
    };
    window.addEventListener("studio:open-lesson", openLesson);
    return () => window.removeEventListener("studio:open-lesson", openLesson);
  }, [course.id]);
  const structure = getCourseStructureSummary(course);
  const policy = getInstructorEditPolicy({ status: course.status, isOwner: true, publishedEditsAllowed: course.publishedEditsAllowed });
  const readiness = useMemo(() => evaluateCourseReadiness({ course }), [course]);
  const pendingCount = course.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.isPending).length;
  const tabs = <nav aria-label="أقسام الدورة" className={styles.editorNav}>
    {(Object.keys(panels) as Panel[]).map((key) => <button aria-current={panel === key ? "page" : undefined}
      className={styles.secondaryLink} disabled={isBusy} key={key} onClick={() => setPanel(key)} type="button">{panels[key]}</button>)}
  </nav>;
  return <>
    <InstructorPageHeader action={{ href: "/studio/courses", label: "العودة إلى دوراتي" }}
      description={course.department + (course.courseCode ? " · " + course.courseCode : "")} title={course.title} />
    <section aria-label="حالة الدورة" className={styles.snapshot}>
      <div><span>الحالة</span><strong className={styles.status}>{instructorCourseStatusLabel[course.status]}</strong></div>
      <div><span>الوحدات</span><strong><bdi>{structure.moduleCount}</bdi></strong></div>
      <div><span>الدروس الجاهزة</span><strong><bdi dir="ltr">{structure.readyLessonCount} / {structure.lessonCount}</bdi></strong></div>
    </section>
    {tabs}
    {course.status === "published" ? <p className={styles.readOnlyNotice}>{policy.canEditDescription
      ? "التعديل متاح بإذن المسؤول. الدروس الجديدة لا تظهر للمتعلمين حتى نشر الإضافات. المحتوى المنشور محفوظ."
      : "الدورة منشورة؛ يمكن للمسؤول تفعيل تعديل التفاصيل وإضافة دروس جديدة."}</p> : null}
    <section className={styles.section} aria-label="محتوى الدورة">
      <div className={styles.sectionHeading}><h2>محتوى الدورة</h2><span>{pendingCount > 0 ? formatArabicLessonCount(pendingCount) + " بانتظار النشر" : ""}</span></div>
      {course.modules.length ? <ol className={styles.workspaceOutline}>{course.modules.map((module) => <li key={module.id}>
        <button className={styles.textButton} onClick={() => { setPanel("content"); window.location.hash = "module-" + module.id; }} type="button">{module.title}</button>
        <span>{formatArabicLessonCount(module.lessons.length)}{module.isPending ? " · إضافة غير منشورة" : ""}</span>
      </li>)}</ol> : <p>لا يوجد محتوى بعد. افتح «المحتوى» لإضافة أول وحدة.</p>}
    </section>
    <StudioDialog open={panel !== null} title={panel ? panels[panel] : "الدورة"} onClose={() => setPanel(null)}>
      {tabs}
      {videoActivity.length ? <details className={styles.videoActivity}>
        <summary>متابعة عمليات الفيديو (<bdi>{videoActivity.length}</bdi>)</summary>
        <ul>{videoActivity.map((upload) => <li key={upload.lessonId}>
          <span>{upload.lessonTitle} · {upload.isPreparing ? "تجهيز الرفع" : upload.mediaStatus === "processing" ? "معالجة الفيديو" : "رفع الفيديو"}</span>
          {upload.courseId === course.id ? <a href={`#lesson-${upload.lessonId}`} onClick={() => setPanel("content")}>فتح الدرس</a> : <span>{upload.courseTitle}</span>}
        </li>)}</ul>
      </details> : null}
      <div onClick={(event) => {
        const href = (event.target as HTMLElement).closest("a")?.getAttribute("href");
        if (href?.startsWith("#")) setPanel(href === "#course-details" ? "details" : "content");
      }}>
        <div hidden={panel !== "content"} id="curriculum">
          <InstructorCurriculumBuilder courseId={course.id} courseTitle={course.title}
            editable={policy.canPrepareAdditions} published={course.status === "published"} modules={course.modules}
            onModulesChange={(next) => setCourse((current) => ({ ...current, modules: typeof next === "function" ? next(current.modules) : next }))} />
        </div>
        <div hidden={panel !== "details"} id="course-details">
          <InstructorCourseDetailsForm course={course} onSaved={(saved) => setCourse((current) => ({ ...saved, modules: current.modules }))} />
        </div>
        <div hidden={panel !== "publication"} id="publication">
          <InstructorPublicationActions capability={publishingCapability} course={course} readiness={readiness}
            onReleased={() => setCourse((current) => ({ ...current, modules: current.modules.map((module) => ({ ...module, isPending: false, lessons: module.lessons.map((lesson) => ({ ...lesson, isPending: false })) })) }))}
            onStatusChange={(status) => setCourse((current) => ({ ...current, status }))} />
        </div>
      </div>
    </StudioDialog>
  </>;
}
