import { type NextRequest, NextResponse } from "next/server";

import { protectRequest } from "@/lib/security/request-protection";
import { refreshSession } from "@/lib/supabase/proxy";

export function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const blockedResponse = protectRequest(request);

  if (blockedResponse) {
    blockedResponse.headers.set("x-request-id", requestId);
    return blockedResponse;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = hasSupabaseSessionCookie(request)
    ? await refreshSession(request, requestHeaders)
    : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
