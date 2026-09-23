import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ApplicationRole = "learner" | "instructor" | "admin";

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string;
  role: ApplicationRole;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile === null) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    role: profile.role,
  };
});

export function getRoleHomePath(role: ApplicationRole) {
  switch (role) {
    case "instructor":
      return "/studio";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}
