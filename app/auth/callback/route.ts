import { type NextRequest, NextResponse } from "next/server";

import { getSafeRedirectUrl } from "@/lib/auth/redirect";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

function redirectWithoutCredentials(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: NextRequest) {
  // Railway may expose the internal listening address in request.nextUrl.
  // Authentication redirects must use the configured public site URL.
  const siteUrl = getPublicEnvironment().NEXT_PUBLIC_SITE_URL;
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = request.nextUrl.searchParams.get("next");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  const successUrl = getSafeRedirectUrl(siteUrl, nextPath, "/account");
  successUrl.searchParams.set("auth", "verified");

  // Unlike the PKCE code exchange, email token verification does not require
  // the cookie from the browser/device where registration began. Never accept
  // arbitrary OTP types here or fall back to a code after a token failure.
  if (tokenHash !== null) {
    if (tokenHash.length > 0 && tokenHash.length <= 2048 && type === "email") {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });

      if (!error) {
        return redirectWithoutCredentials(successUrl);
      }
    }
  } else if (code !== null) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectWithoutCredentials(successUrl);
    }
  }

  const errorUrl = new URL("/", siteUrl);
  errorUrl.searchParams.set("auth_error", "confirmation_failed");

  return redirectWithoutCredentials(errorUrl);
}
