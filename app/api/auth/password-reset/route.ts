import { NextResponse } from "next/server";

import { requestPasswordResetSchema } from "@/lib/auth/schemas";
import { getPublicEnvironment } from "@/lib/env/public";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, requestPasswordResetSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const environment = getPublicEnvironment();
  const callbackUrl = new URL(
    "/auth/callback",
    environment.NEXT_PUBLIC_SITE_URL,
  );
  callbackUrl.searchParams.set("next", "/auth/reset-password");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: callbackUrl.toString() },
  );

  if (error) {
    return createApiError(
      error.status === 429 ? 429 : 503,
      error.status === 429 ? "rate_limited" : "password_reset_unavailable",
      error.status === 429
        ? "Too many reset attempts. Please try again later."
        : "Password reset is temporarily unavailable.",
    );
  }

  // The same response is returned whether or not the account exists.
  return NextResponse.json(
    {
      data: {
        message:
          "If an account exists for that email, a reset link has been sent.",
      },
    },
    { status: 202 },
  );
}
