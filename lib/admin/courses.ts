import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminCourseListResponseSchema, adminCourseStatusResponseSchema } from "@/lib/contracts";
import type { AdminCourseListQuery } from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";
import { adminCourseEditPermissionResponseSchema } from "@/lib/contracts/admin";

type AdminCourseStatus = "draft" | "published" | "archived";

export async function getAdminCourseEditPermissions(supabase: SupabaseClient<Database>, courseIds: string[]) {
  if (courseIds.length === 0) return new Map<string, boolean>();
  const { data, error } = await supabase.from("courses")
    .select("id, instructor_published_edits_allowed").in("id", courseIds);
  if (error || !data) throw new AdminCourseError(500, "admin_courses_failed", "Course permissions could not be loaded.");
  return new Map(data.map((course) => [course.id, course.instructor_published_edits_allowed]));
}

export class AdminCourseError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

// Permission storage only: live authoring still requires the enforcement and
// pending-content safeguards. Do not infer edit access from this endpoint alone.
export async function changeAdminCourseEditPermission(
  supabase: SupabaseClient<Database>,
  courseId: string,
  publishedEditsAllowed: boolean,
) {
  const { data, error } = await supabase.rpc("admin_set_course_edit_permission", {
    target_course_id: courseId,
    allow_edits: publishedEditsAllowed,
  });

  if (error?.code === "42501") throw new AdminCourseError(403, "forbidden", "Administrator role required.");
  if (error?.code === "P0002") throw new AdminCourseError(404, "course_not_found", "The course was not found.");
  if (error?.code === "22023") throw new AdminCourseError(422, "invalid_edit_permission", "The edit permission must be true or false.");
  // False is a successful revocation, not an absent RPC result.
  if (error || typeof data !== "boolean") {
    throw new AdminCourseError(500, "admin_course_permission_failed", "The edit permission could not be changed.");
  }

  return adminCourseEditPermissionResponseSchema.parse({
    data: { courseId, publishedEditsAllowed: data },
  });
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
      readiness: {
        canPublish: course.module_count > 0 && course.lesson_count > 0 && course.unready_lesson_count === 0,
        moduleCount: course.module_count,
        lessonCount: course.lesson_count,
        unreadyLessonCount: course.unready_lesson_count,
      },
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
  if (error?.code === "23514") throw new AdminCourseError(409, "course_not_ready", "Complete the required course content before publishing it.");
  if (error || !data) throw new AdminCourseError(500, "admin_course_update_failed", "The course status could not be changed.");

  return adminCourseStatusResponseSchema.parse({
    data: { courseId: data.id, status: data.status, publishedAt: data.published_at },
  });
}
