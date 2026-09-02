import { createApiError } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    return createApiError(
      500,
      "sign_out_failed",
      "The session could not be ended.",
    );
  }

  return new Response(null, { status: 204 });
}
