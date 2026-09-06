import "server-only";

import { requireInstructorAuthoringContext } from "./access";
import { AuthoringError, throwAuthoringDatabaseError } from "./errors";
import { toAuthoringModule } from "./transform";

export async function createCourseModule(courseId: string, title: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase.rpc("append_course_module", {
    target_course_id: courseId,
    module_title: title,
  });

  if (error) throwAuthoringDatabaseError(error, "The module could not be created.");
  if (!data) throw new AuthoringError(500, "authoring_failed", "The module could not be created.");
  return toAuthoringModule(data);
}

export async function renameCourseModule(moduleId: string, title: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("modules")
    .update({ title })
    .eq("id", moduleId)
    .select("id, course_id, title, position, courses!inner(status)")
    .neq("courses.status", "archived")
    .maybeSingle();

  if (error) throwAuthoringDatabaseError(error, "The module could not be updated.");
  if (!data) throw new AuthoringError(404, "module_not_found", "The editable module was not found.");
  return toAuthoringModule(data);
}

export async function reorderCourseModules(courseId: string, moduleIds: string[]) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { error } = await supabase.rpc("reorder_course_modules", {
    target_course_id: courseId,
    ordered_module_ids: moduleIds,
  });

  if (error) throwAuthoringDatabaseError(error, "Modules could not be reordered.");
  return { moduleIds };
}

export async function deleteCourseModule(moduleId: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { error } = await supabase.rpc("delete_draft_course_module", {
    target_module_id: moduleId,
  });

  if (error) throwAuthoringDatabaseError(error, "The module could not be deleted.");
}
