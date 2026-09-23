import "server-only";

import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function getAdminView(path: string) {
  const [viewer, supabase] = await Promise.all([
    requireRole(path, "admin"),
    createClient(),
  ]);

  return { viewer, supabase };
}
