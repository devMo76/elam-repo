import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type MediaStatus = Database["public"]["Enums"]["media_status"];

export type ManagedVideoLesson = {
  id: string;
  title: string;
  mediaStatus: MediaStatus;
  videoAssetId: string | null;
};

type LessonAccessResult =
  | { success: true; lesson: ManagedVideoLesson }
  | {
      success: false;
      status: number;
      code: string;
      message: string;
    };

export async function getManagedVideoLesson(
  lessonId: string,
): Promise<LessonAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      status: 401,
      code: "unauthenticated",
      message: "Sign-in is required.",
    };
  }

  const [profileResult, lessonResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("lessons")
      .select("id, title, module_id, media_status, video_asset_id")
      .eq("id", lessonId)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data) {
    return {
      success: false,
      status: 403,
      code: "forbidden",
      message: "An instructor or administrator role is required.",
    };
  }

  if (
    profileResult.data.role !== "instructor" &&
    profileResult.data.role !== "admin"
  ) {
    return {
      success: false,
      status: 403,
      code: "forbidden",
      message: "An instructor or administrator role is required.",
    };
  }

  if (lessonResult.error) {
    return {
      success: false,
      status: 500,
      code: "lesson_lookup_failed",
      message: "The lesson could not be checked.",
    };
  }

  if (!lessonResult.data) {
    return {
      success: false,
      status: 404,
      code: "lesson_not_found",
      message: "The lesson was not found.",
    };
  }

  const lesson = lessonResult.data;
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .maybeSingle();

  if (moduleError || !module) {
    return {
      success: false,
      status: 404,
      code: "lesson_not_found",
      message: "The lesson was not found.",
    };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("instructor_id")
    .eq("id", module.course_id)
    .maybeSingle();

  if (courseError || !course) {
    return {
      success: false,
      status: 404,
      code: "lesson_not_found",
      message: "The lesson was not found.",
    };
  }

  const isAdmin = profileResult.data.role === "admin";
  const isOwner =
    profileResult.data.role === "instructor" &&
    course.instructor_id === user.id;

  if (!isAdmin && !isOwner) {
    return {
      success: false,
      status: 403,
      code: "forbidden",
      message: "You cannot manage video for this lesson.",
    };
  }

  return {
    success: true,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      mediaStatus: lesson.media_status,
      videoAssetId: lesson.video_asset_id,
    },
  };
}
