import "server-only";

import { createApiError } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false as const,
      response: createApiError(401, "unauthenticated", "Sign-in is required."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return {
      authorized: false as const,
      response: createApiError(403, "forbidden", "Administrator role required."),
    };
  }

  return {
    authorized: true as const,
    supabase,
    user,
  };
}
