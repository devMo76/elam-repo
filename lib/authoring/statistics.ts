import "server-only";

import { instructorStatisticsResponseSchema } from "@/lib/contracts";

import { requireInstructorAuthoringContext } from "./access";
import { throwAuthoringDatabaseError } from "./errors";

export async function getInstructorStatistics() {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase.rpc("instructor_course_stats");

  if (error) {
    throwAuthoringDatabaseError(error, "Instructor statistics could not be loaded.");
  }

  return instructorStatisticsResponseSchema.parse({
    data: data.map((statistic) => ({
      courseId: statistic.course_id,
      title: statistic.course_title,
      status: statistic.course_status,
      enrollmentCount: statistic.enrollment_count,
    })),
  });
}
