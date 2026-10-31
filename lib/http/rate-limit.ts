import "server-only";

import { createHmac } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createApiError } from "./api-response";

type LimitRule = {
  action: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
};

function clientAddress(request: Request) {
  // Vercel overwrites this header at its edge. Other hosting must establish
  // an equivalent trusted proxy before treating it as a true client address.
  const header = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")
    : request.headers.get("x-forwarded-for");
  return header?.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
}

export async function checkRateLimits(request: Request, rules: LimitRule[]): Promise<Response | null> {
  const secret = getServerEnvironment().SUPABASE_SERVICE_ROLE_KEY;
  const admin = createAdminClient();
  for (const rule of rules) {
    const identity = rule.subject ? `subject:${rule.subject.trim().toLowerCase()}` : `ip:${clientAddress(request)}`;
    const keyHash = createHmac("sha256", secret).update(identity).digest("hex");
    const { data, error } = await admin.rpc("consume_api_rate_limit", {
      target_action: rule.action,
      target_key_hash: keyHash,
      target_window_seconds: rule.windowSeconds,
      target_limit: rule.limit,
    });
    if (error) return createApiError(503, "rate_limit_unavailable", "Please try again later.");
    if (!data) {
      const response = createApiError(429, "rate_limited", "Too many attempts. Please try again later.");
      response.headers.set("Retry-After", String(rule.windowSeconds));
      return response;
    }
  }
  return null;
}
