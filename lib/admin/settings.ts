import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export type AdminPlatformSettings = {
  instructorDirectPublish: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

/** Server-only adapter for the existing protected platform-settings record. */
export async function getAdminPlatformSettings(
  supabase: SupabaseClient<Database>,
): Promise<AdminPlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("instructor_direct_publish, updated_at, updated_by")
    .eq("id", 1)
    .single();

  if (error || data === null) {
    throw new Error("Platform settings could not be loaded.");
  }

  return {
    instructorDirectPublish: data.instructor_direct_publish,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
}
