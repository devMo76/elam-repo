import { NextResponse } from "next/server";
import { policyAcceptanceSchema } from "@/lib/auth/schemas";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, policyAcceptanceSchema);
  if (!parsed.success) return parsed.response;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return createApiError(401, "unauthenticated", "Sign-in is required.");
  const { error } = await supabase.rpc("accept_current_policy", { requested_version: parsed.data.policyVersion });
  if (error) return createApiError(503, "policy_acceptance_failed", "Your agreement could not be saved. Please retry.");
  return NextResponse.json({ data: { accepted: true } }, { headers: { "Cache-Control": "private, no-store" } });
}
