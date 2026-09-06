import type { NextRequest } from "next/server";

import { protectRequest } from "@/lib/security/request-protection";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const blockedResponse = protectRequest(request);

  if (blockedResponse) {
    return blockedResponse;
  }

  return refreshSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
