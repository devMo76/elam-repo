import "server-only";

import { z } from "zod";

import {
  courseReadinessBlockerCodeSchema,
  courseReadinessTargetSchema,
} from "@/lib/contracts";

import { requireInstructorAuthoringContext } from "./access";
import {
  AuthoringError,
  CourseNotReadyError,
  throwAuthoringDatabaseError,
} from "./errors";
import { getCourseReadinessBlockerMessage } from "./readiness";

const databaseReadinessBlockerSchema = z.strictObject({
  code: courseReadinessBlockerCodeSchema,
  target: courseReadinessTargetSchema,
  entityId: z.uuid().optional(),
});

const submissionResultSchema = z.strictObject({
  course_id: z.uuid(),
  status: z.enum(["draft", "in_review"]),
  blockers: z.array(databaseReadinessBlockerSchema),
});

export async function submitInstructorCourse(courseId: string) {
  const { supabase } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .rpc("submit_course_for_review", {
      target_course_id: courseId,
    })
    .single();

  if (error) {
    throwAuthoringDatabaseError(error, "The course could not be submitted.");
  }

  const result = submissionResultSchema.safeParse(data);

  if (!result.success) {
    throw new AuthoringError(
      500,
      "authoring_failed",
      "The course could not be submitted.",
    );
  }

  if (result.data.blockers.length > 0) {
    throw new CourseNotReadyError(
      result.data.blockers.map((blocker) => ({
        ...blocker,
        message: getCourseReadinessBlockerMessage(blocker.code),
      })),
    );
  }

  return { courseId: result.data.course_id, status: result.data.status };
}

export async function publishInstructorCourse(courseId: string) {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .in("status", ["draft", "in_review"])
    .select("id, status")
    .maybeSingle();

  if (error?.code === "42501") {
    throw new AuthoringError(
      403,
      "direct_publish_disabled",
      "Direct publishing is not enabled. Submit the course for review instead.",
    );
  }

  if (error) {
    throwAuthoringDatabaseError(error, "The course could not be published.");
  }

  if (!data) {
    throw new AuthoringError(
      404,
      "course_not_found",
      "The publishable course was not found.",
    );
  }

  return { courseId: data.id, status: data.status };
}
