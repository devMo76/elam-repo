import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (code !== null) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const successUrl = request.nextUrl.clone();
      successUrl.pathname = nextPath;
      successUrl.search = "";
      successUrl.searchParams.set("auth", "verified");

      return NextResponse.redirect(successUrl);
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/";
  errorUrl.search = "";
  errorUrl.searchParams.set("auth_error", "confirmation_failed");

  return NextResponse.redirect(errorUrl);
}
