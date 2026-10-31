import { NextResponse } from "next/server";

import { signInSchema } from "@/lib/auth/schemas";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { checkRateLimits } from "@/lib/http/rate-limit";
import {
  measureServerOperation,
  observeServerRequest,
} from "@/lib/observability/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  return observeServerRequest("auth.sign-in", request.method, async () => {
    const parsed = await parseJsonBody(request, signInSchema);

    if (!parsed.success) {
      return parsed.response;
    }

    const limited = await checkRateLimits(request, [
      { action: "auth.signin.ip", limit: 20, windowSeconds: 300 },
      { action: "auth.signin.email", subject: parsed.data.email, limit: 8, windowSeconds: 900 },
    ]);
    if (limited) return limited;

    const supabase = await createClient();
    const { data, error } = await measureServerOperation(
      "supabase.auth.sign-in",
      "supabase",
      () => supabase.auth.signInWithPassword(parsed.data),
    );

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
  });
}
