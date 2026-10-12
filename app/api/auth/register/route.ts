import { NextResponse } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { registerSchema } from "@/lib/auth/schemas";
import { getPublicEnvironment } from "@/lib/env/public";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { checkRateLimits } from "@/lib/http/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, registerSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const limited = await checkRateLimits(request, [
    { action: "auth.register.ip", limit: 5, windowSeconds: 3600 },
    { action: "auth.register.email", subject: parsed.data.email, limit: 3, windowSeconds: 3600 },
  ]);
  if (limited) return limited;

  const environment = getPublicEnvironment();
  const confirmationUrl = new URL(
    "/auth/callback",
    environment.NEXT_PUBLIC_SITE_URL,
  );
  confirmationUrl.searchParams.set(
    "next",
    getSafeRedirectPath(parsed.data.next ?? null, "/account"),
  );

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: confirmationUrl.toString(),
    },
  });

  if (error) {
    return createApiError(
      error.status === 429 ? 429 : 400,
      error.status === 429 ? "rate_limited" : "registration_failed",
      error.status === 429
        ? "Too many registration attempts. Please try again later."
        : "Registration could not be completed.",
    );
  }

  return NextResponse.json(
    {
      data: {
        message: "Check your email to verify your account.",
      },
    },
    { status: 202 },
  );
}
