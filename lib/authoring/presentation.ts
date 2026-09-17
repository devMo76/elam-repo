export type AuthoringCourseStatus = "draft" | "in_review" | "published" | "archived";

export const instructorCourseStatusLabel: Record<AuthoringCourseStatus, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  published: "منشور",
  archived: "مؤرشف",
};

export type CourseStructure = {
  modules: Array<{
    lessons: Array<{ mediaStatus: "absent" | "uploading" | "processing" | "ready" | "failed" }>;
  }>;
};

export function getCourseStructureSummary(course: CourseStructure) {
  const moduleCount = course.modules.length;
  const lessons = course.modules.flatMap((module) => module.lessons);
  const readyLessonCount = lessons.filter((lesson) => lesson.mediaStatus === "ready").length;

  return {
    moduleCount,
    lessonCount: lessons.length,
    readyLessonCount,
  };
}
