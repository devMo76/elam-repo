import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminCourseListResponseSchema, adminCourseStatusResponseSchema } from "@/lib/contracts";
import type { AdminCourseListQuery } from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";

type AdminCourseStatus = "draft" | "published" | "archived";

export class AdminCourseError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export async function getAdminCourses(
  supabase: SupabaseClient<Database>,
  query: AdminCourseListQuery,
) {
  const { data, error } = await supabase.rpc("admin_course_review_queue", {
    search_query: query.search,
    filter_status: query.status,
    page_size: query.pageSize,
    page_offset: (query.page - 1) * query.pageSize,
  });
  if (error || !data) throw new AdminCourseError(500, "admin_courses_failed", "Courses could not be loaded.");

  const totalCount = data[0]?.total_count ?? 0;
  return adminCourseListResponseSchema.parse({
    data: data.map((course) => ({
      id: course.course_id, slug: course.course_slug, courseCode: course.course_code,
      title: course.course_title, status: course.course_status,
      instructorId: course.instructor_id, instructorName: course.instructor_name,
      createdAt: course.created_at, publishedAt: course.published_at,
    })),
    pagination: { page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize) },
  });
}

export async function changeAdminCourseStatus(
  supabase: SupabaseClient<Database>,
  courseId: string,
  status: AdminCourseStatus,
) {
  const { data, error } = await supabase.rpc("admin_change_course_status", {
    target_course_id: courseId,
    new_status: status,
  });

  if (error?.code === "P0002") throw new AdminCourseError(404, "course_not_found", "The course was not found.");
  if (error?.code === "22023") throw new AdminCourseError(409, "invalid_course_transition", "This course status change is not allowed.");
  if (error || !data) throw new AdminCourseError(500, "admin_course_update_failed", "The course status could not be changed.");

  return adminCourseStatusResponseSchema.parse({
    data: { courseId: data.id, status: data.status, publishedAt: data.published_at },
  });
}
