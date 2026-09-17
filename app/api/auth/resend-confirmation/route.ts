import { NextResponse } from "next/server";

import { resendConfirmationSchema } from "@/lib/auth/schemas";
import { getPublicEnvironment } from "@/lib/env/public";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, resendConfirmationSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const environment = getPublicEnvironment();
  const confirmationUrl = new URL(
    "/auth/callback",
    environment.NEXT_PUBLIC_SITE_URL,
  );
  confirmationUrl.searchParams.set("next", "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: confirmationUrl.toString() },
  });

  if (error) {
    return createApiError(
      error.status === 429 ? 429 : 503,
      error.status === 429 ? "rate_limited" : "confirmation_unavailable",
      error.status === 429
        ? "Too many confirmation requests. Please try again later."
        : "Confirmation email is temporarily unavailable.",
    );
  }

  // Keep this response generic so the endpoint cannot be used to enumerate
  // pending accounts.
  return NextResponse.json(
    { data: { message: "If the account needs confirmation, an email was sent." } },
    { status: 202 },
  );
}
