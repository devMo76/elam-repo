import { NextResponse } from "next/server";

import { signInSchema } from "@/lib/auth/schemas";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, signInSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return createApiError(
      error.status === 429 ? 429 : 401,
      error.status === 429 ? "rate_limited" : "invalid_credentials",
      error.status === 429
        ? "Too many sign-in attempts. Please try again later."
        : "The email or password is incorrect.",
    );
  }

  return NextResponse.json({
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    },
  });
}
