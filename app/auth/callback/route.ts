import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectUrl } from "@/lib/auth/redirect";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Railway may expose the internal listening address in request.nextUrl.
  // Authentication redirects must use the configured public site URL.
  const siteUrl = getPublicEnvironment().NEXT_PUBLIC_SITE_URL;
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = request.nextUrl.searchParams.get("next");

  if (code !== null) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const successUrl = getSafeRedirectUrl(
        siteUrl,
        nextPath,
        "/account",
      );
      successUrl.searchParams.set("auth", "verified");

      return NextResponse.redirect(successUrl);
    }
  }

  const errorUrl = new URL("/", siteUrl);
  errorUrl.searchParams.set("auth_error", "confirmation_failed");

  return NextResponse.redirect(errorUrl);
}
