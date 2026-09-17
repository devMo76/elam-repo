import "server-only";

import { z } from "zod";

import {
  parseRawCatalogueCourse,
  toCatalogueCourseDetail,
} from "@/lib/catalogue/transform";
import type { CatalogueCourseDetail } from "@/lib/contracts";
import { createClient } from "@/lib/supabase/server";

const courseDetailSelect = [
  "id, slug, department, course_code, title, subtitle, price_halalas, currency, cover_url, description, status,",
  "instructor:profiles!courses_instructor_id_fkey (id, full_name, avatar_url, headline, bio),",
  "modules (id, title, position, lessons (id, title, position, duration_seconds, is_free_preview))",
].join("\n");

export type LearningCourseDetail = CatalogueCourseDetail & {
  completedLessonIds: string[];
};

export async function getLearningCourseById(
  courseId: string,
): Promise<LearningCourseDetail | null> {
  const parsedCourseId = z.uuid().safeParse(courseId);

  if (!parsedCourseId.success) return null;

  const supabase = await createClient();
  const [{ data: course, error: courseError }, { data: user, error: userError }] =
    await Promise.all([
      supabase
        .from("courses")
        .select(courseDetailSelect)
        .eq("id", parsedCourseId.data)
        .eq("status", "published")
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);

  if (courseError) {
    throw new Error("Learning course could not be loaded.");
  }

  if (!course) return null;

  const catalogueCourse = toCatalogueCourseDetail(
    parseRawCatalogueCourse(course),
    false,
  );

  if (userError || !user.user) {
    return { ...catalogueCourse, completedLessonIds: [] };
  }

  const lessonIds = catalogueCourse.modules.flatMap((module) =>
    module.lessons.map((lesson) => lesson.id),
  );
  const enrollmentPromise = supabase
    .from("enrollments")
    .select("course_id")
    .eq("course_id", parsedCourseId.data)
    .eq("user_id", user.user.id)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .maybeSingle();
  const completedLessonsPromise = lessonIds.length > 0
    ? supabase
        .from("lesson_progress")
        .select("lesson_id")
        .in("lesson_id", lessonIds)
        .not("completed_at", "is", null)
    : Promise.resolve({ data: [], error: null });
  const [{ data: enrollment, error: enrollmentError }, { data: completedLessons, error: completedLessonsError }] =
    await Promise.all([enrollmentPromise, completedLessonsPromise]);

  if (enrollmentError || completedLessonsError) {
    throw new Error("Learning enrolment could not be loaded.");
  }

  return {
    ...catalogueCourse,
    isEnrolled: enrollment !== null,
    completedLessonIds: completedLessons.map((lesson) => lesson.lesson_id),
  };
}
