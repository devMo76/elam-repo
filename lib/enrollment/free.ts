import "server-only";

import { freeCourseEnrollmentResponseSchema } from "@/lib/contracts";
import { createClient } from "@/lib/supabase/server";

export class FreeCourseEnrollmentError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function claimFreeCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    throw new FreeCourseEnrollmentError(401, "unauthenticated", "Sign-in is required.");
  }

  if (user.email_confirmed_at === null) {
    throw new FreeCourseEnrollmentError(
      403,
      "email_verification_required",
      "Verify your email before enrolling in a course.",
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new FreeCourseEnrollmentError(500, "free_enrollment_failed", "The course could not be added.");
  }

  if (profile?.role !== "learner") {
    throw new FreeCourseEnrollmentError(403, "learner_required", "A learner account is required to enroll.");
  }

  const { data, error } = await supabase.rpc("claim_free_course", {
    target_course: courseId,
  });

  if (error?.code === "P0002") {
    throw new FreeCourseEnrollmentError(404, "free_course_not_available", "The free course is not available.");
  }

  if (error || data.length !== 1) {
    throw new FreeCourseEnrollmentError(500, "free_enrollment_failed", "The course could not be added.");
  }

  return freeCourseEnrollmentResponseSchema.parse({
    data: {
      courseId: data[0].course_id,
      grantedAt: data[0].granted_at,
    },
  });
}
