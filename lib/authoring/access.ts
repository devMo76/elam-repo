import "server-only";

import { createClient } from "@/lib/supabase/server";

import { AuthoringError } from "./errors";

export async function requireInstructorAuthoringContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthoringError(401, "unauthenticated", "Sign-in is required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "instructor") {
    throw new AuthoringError(
      403,
      "instructor_required",
      "An instructor account is required.",
    );
  }

  return { supabase, user };
}
