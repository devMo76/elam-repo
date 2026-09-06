import { getAdminAuditHistory } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminAuditListQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireAdmin(); if (!auth.authorized) return auth.response;
  const query = adminAuditListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return createApiError(422, "invalid_admin_audit_filters", "The audit filters are invalid.");
  try { return Response.json(await getAdminAuditHistory(auth.supabase, query.data), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return createApiError(500, "admin_audit_failed", "Audit history could not be loaded."); }
}
