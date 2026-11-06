import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { AdminCourseError } from "./courses";

export async function getInstructorUpdatePermissions(supabase: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return new Map<string, boolean>();
  const { data, error } = await supabase.from("profiles")
    .select("id, instructor_published_updates_allowed").eq("role", "instructor").in("id", ids);
  if (error || !data) throw new Error("Instructor permissions could not be loaded.");
  return new Map(data.map(profile => [profile.id, profile.instructor_published_updates_allowed]));
}

export async function changeInstructorUpdatePermission(supabase: SupabaseClient<Database>, instructorId: string, allowed: boolean) {
  const { data, error } = await supabase.rpc("admin_set_instructor_edit_permission", {
    target_instructor_id: instructorId, allow_edits: allowed,
  });
  if (error?.code === "42501") throw new AdminCourseError(403, "forbidden", "Administrator role required.");
  if (error?.code === "P0002") throw new AdminCourseError(404, "instructor_not_found", "The instructor was not found.");
  if (error?.code === "22023") throw new AdminCourseError(422, "invalid_edit_permission", "The edit permission must be true or false.");
  if (error || typeof data !== "boolean") throw new AdminCourseError(500, "admin_instructor_permission_failed", "The instructor permission could not be changed.");
  return { data: { instructorId, publishedEditsAllowed: data } };
}
