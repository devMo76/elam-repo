import "server-only";

import type { UpdateLessonRequest } from "@/lib/contracts";

import { requireInstructorAuthoringContext } from "./access";
import { AuthoringError, throwAuthoringDatabaseError } from "./errors";
import { toAuthoringLesson } from "./transform";

const lessonSelect =
  "id, module_id, title, position, duration_seconds, is_free_preview, media_status";

export async function createModuleLesson(moduleId: string, title: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase.rpc("append_module_lesson", {
    target_module_id: moduleId,
    lesson_title: title,
  });

  if (error) {
    throwAuthoringDatabaseError(error, "The lesson could not be created.");
  }

  if (!data) {
    throw new AuthoringError(
      500,
      "authoring_failed",
      "The lesson could not be created.",
    );
  }

  return toAuthoringLesson(data);
}

export async function updateModuleLesson(
  lessonId: string,
  input: UpdateLessonRequest,
) {
  const { supabase } = await requireInstructorAuthoringContext();
  const changes = {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.isFreePreview === undefined
      ? {}
      : { is_free_preview: input.isFreePreview }),
  };
  const { data, error } = await supabase
    .from("lessons")
    .update(changes)
    .eq("id", lessonId)
    .select(lessonSelect)
    .maybeSingle();

  if (error) {
    throwAuthoringDatabaseError(error, "The lesson could not be updated.");
  }

  if (!data) {
    throw new AuthoringError(
      404,
      "lesson_not_found",
      "The editable lesson was not found.",
    );
  }

  return toAuthoringLesson(data);
}

export async function reorderModuleLessons(
  moduleId: string,
  lessonIds: string[],
) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { error } = await supabase.rpc("reorder_module_lessons", {
    target_module_id: moduleId,
    ordered_lesson_ids: lessonIds,
  });

  if (error) {
    throwAuthoringDatabaseError(error, "Lessons could not be reordered.");
  }

  return { lessonIds };
}

export async function deleteModuleLesson(lessonId: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { error } = await supabase.rpc("delete_draft_module_lesson", {
    target_lesson_id: lessonId,
  });

  if (error) {
    throwAuthoringDatabaseError(error, "The lesson could not be deleted.");
  }
}
