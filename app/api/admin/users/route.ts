import { getAdminUsers } from "@/lib/admin/directory";
import { requireAdmin } from "@/lib/auth/authorization";
import { adminUserListQuerySchema } from "@/lib/contracts";
import { createApiError } from "@/lib/http/api-response";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const auth = await requireAdmin(); if (!auth.authorized) return auth.response;
  const query = adminUserListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return createApiError(422, "invalid_admin_user_filters", "The user filters are invalid.");
  try { return Response.json(await getAdminUsers(auth.supabase, query.data), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return createApiError(500, "admin_users_failed", "Users could not be loaded."); }
}
