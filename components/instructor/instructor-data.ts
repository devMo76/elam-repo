import "server-only";

import { listInstructorCourses } from "@/lib/authoring/courses";

/** Shared server-only query for the studio overview and library. */
export async function getInstructorCourses() {
  return listInstructorCourses();
}
