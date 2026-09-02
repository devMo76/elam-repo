import "server-only";

import {
  learnerCourseProgressSchema,
  type LearnerCourseProgress,
} from "@/lib/contracts";
import { createClient } from "@/lib/supabase/server";

export class ProgressDataError extends Error {
  constructor() {
    super("Learner course progress could not be loaded.");
    this.name = "ProgressDataError";
  }
}

export async function getLearnerCourseProgress(): Promise<
  LearnerCourseProgress[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_learner_course_progress");

  if (error) {
    throw new ProgressDataError();
  }

  return data.map((row) =>
    learnerCourseProgressSchema.parse({
      courseId: row.course_id,
      slug: row.slug,
      title: row.title,
      coverUrl: row.cover_url,
      status: row.status,
      lessonCount: row.lesson_count,
      completedLessonCount: row.completed_lesson_count,
      completionPercentage: row.completion_percentage,
      lastActivityAt: row.last_activity_at,
    }),
  );
}
