import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnvironment } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";
import { policyAcceptancePath, requiresPolicyCheck } from "@/lib/policy-version";

export async function refreshSession(request: NextRequest) {
  const environment = getPublicEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // getUser verifies the access token with Supabase Auth. Do not replace this
  // authorization boundary with getSession(), which only reads cookie data.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!authError && user && requiresPolicyCheck(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    // Only the database-owned role can exempt an account, never auth metadata
    // or the requested route (a learner visiting /admin is still a learner).
    if (!profileError && profile?.role === "admin") return response;

    const { data: accepted, error } = await supabase.rpc("has_current_policy_acceptance");
    if (accepted !== true || error) {
      const destination = policyAcceptancePath(request.nextUrl.pathname + request.nextUrl.search);
      const gate = request.nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json({ error: {
          code: error ? "policy_check_unavailable" : "policy_acceptance_required",
          message: error ? "Policy verification is temporarily unavailable." : "Accept the current policy to continue.",
          policyUrl: "/policies", acceptanceUrl: destination,
        } }, { status: error ? 503 : 403 })
        : NextResponse.redirect(new URL(destination, request.url));
      // Session refresh cookies must survive redirects and API rejections.
      response.cookies.getAll().forEach(cookie => gate.cookies.set(cookie));
      gate.headers.set("Cache-Control", "private, no-store");
      return gate;
    }
  }

  return response;
}
