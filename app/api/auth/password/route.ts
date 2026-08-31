import { NextResponse } from "next/server";

import { updatePasswordSchema } from "@/lib/auth/schemas";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const parsed = await parseJsonBody(request, updatePasswordSchema);

  if (!parsed.success) {
    return parsed.response;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user === null) {
    return createApiError(
      401,
      "authentication_required",
      "A valid authenticated session is required.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return createApiError(
      error.status === 429 ? 429 : 400,
      error.status === 429 ? "rate_limited" : "password_update_failed",
      error.status === 429
        ? "Too many password updates. Please try again later."
        : "The password could not be updated.",
    );
  }

  return NextResponse.json({
    data: { message: "Password updated successfully." },
  });
}
