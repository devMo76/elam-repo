import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { PolicyAcceptanceDialog } from "@/components/auth/PolicyAcceptanceDialog";
import { createClient } from "@/lib/supabase/server";

export default async function PolicyAcceptancePage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const candidate = getSafeRedirectPath(params.next ?? null, "/account");
  const redirectTo = new URL(candidate, "https://local.invalid").pathname.replace(/\/$/, "") === "/auth/policy" ? "/account" : candidate;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth/sign-in?next=${encodeURIComponent(redirectTo)}`);
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profileError && profile?.role === "admin") redirect(redirectTo);
  const { data: accepted, error } = await supabase.rpc("has_current_policy_acceptance");
  if (!error && accepted === true) redirect(redirectTo);
  return <PolicyAcceptanceDialog redirectTo={redirectTo} />;
}
