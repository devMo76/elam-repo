import { notFound } from "next/navigation";

import { CoursePlayer } from "@/components/learning/CoursePlayer";
import { PublicShell } from "@/components/marketing/PublicShell";
import { requireRole } from "@/lib/auth/guards";
import { measureServerOperation } from "@/lib/observability/server";
import { getLearningCourseById } from "@/lib/progress/course";

type CoursePlayerPageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
};

export default async function CoursePlayerPage({
  params,
  searchParams,
}: CoursePlayerPageProps) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  const viewer = await requireRole("/learn/courses/" + courseId, "learner");
  const course = await measureServerOperation(
    "supabase.learner.course-player",
    "supabase",
    () => getLearningCourseById(courseId),
  );

  if (!course) {
    notFound();
  }

  if (viewer.role === "learner") {
    return (
      <PublicShell>
        <CoursePlayer course={course} initialLessonId={query.lesson ?? null} />
      </PublicShell>
    );
  }

  notFound();
}
