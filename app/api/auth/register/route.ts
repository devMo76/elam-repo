import { NextResponse } from "next/server";

import { registerSchema } from "@/lib/auth/schemas";
import { getPublicEnvironment } from "@/lib/env/public";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, registerSchema);

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
