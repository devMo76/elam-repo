import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toAuthoringCourse } from "@/lib/authoring/transform";
import { AdminCourseError, getAdminCourseEditPermissions } from "./courses";

// Use the reviewer's authenticated client: existing RLS permits admins to read
// drafts, review submissions and private additions. No service-role bypass.
export async function getAdminCourseReview(supabase: SupabaseClient<Database>, courseId: string) {
  const { data, error } = await supabase.from("courses").select(`
    id, slug, title, department, course_code, subtitle, description,
    price_halalas, currency, status, cover_url, created_at, published_at,
    instructor:profiles!courses_instructor_id_fkey(full_name),
    modules(id, course_id, title, position, is_pending,
      lessons(id, module_id, title, position, duration_seconds, is_free_preview, media_status, is_pending))
  `).eq("id", courseId).maybeSingle();
  if (error) throw new AdminCourseError(500, "admin_course_review_failed", "Course content could not be loaded.");
  if (!data) return null;
  const { instructor, ...rawCourse } = data;
  const course = toAuthoringCourse(rawCourse);
  if (course.status === "published") {
    const permissions = await getAdminCourseEditPermissions(supabase, [courseId]);
    course.publishedEditsAllowed = permissions.get(courseId) ?? false;
  }
  return { course, instructorName: instructor?.full_name ?? "شارح" };
}

export type AdminCourseReview = NonNullable<Awaited<ReturnType<typeof getAdminCourseReview>>>;
