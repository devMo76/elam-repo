import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminAuditListResponseSchema, adminUserListResponseSchema } from "@/lib/contracts";
import type { AdminAuditListQuery, AdminUserListQuery } from "@/lib/contracts";
import type { Database } from "@/lib/supabase/database.types";

const pagination = (query: { page: number; pageSize: number }, totalCount: number) => ({
  page: query.page, pageSize: query.pageSize, totalCount, totalPages: Math.ceil(totalCount / query.pageSize),
});

export async function getAdminUsers(supabase: SupabaseClient<Database>, query: AdminUserListQuery) {
  const { data, error } = await supabase.rpc("admin_user_directory", { search_query: query.search, filter_role: query.role, page_size: query.pageSize, page_offset: (query.page - 1) * query.pageSize });
  if (error || !data) throw new Error("Users could not be loaded.");
  const totalCount = data[0]?.total_count ?? 0;
  return adminUserListResponseSchema.parse({ data: data.map((user) => ({ id: user.user_id, fullName: user.full_name, email: user.email, role: user.user_role, createdAt: user.created_at })), pagination: pagination(query, totalCount) });
}

export async function getAdminAuditHistory(supabase: SupabaseClient<Database>, query: AdminAuditListQuery) {
  const { data, error } = await supabase.rpc("admin_audit_history", { filter_action: query.action, page_size: query.pageSize, page_offset: (query.page - 1) * query.pageSize });
  if (error || !data) throw new Error("Audit history could not be loaded.");
  const totalCount = data[0]?.total_count ?? 0;
  return adminAuditListResponseSchema.parse({ data: data.map((entry) => ({ id: entry.audit_id, actorId: entry.actor_id, actorName: entry.actor_name, action: entry.action, subject: entry.subject, detail: entry.detail, createdAt: entry.created_at })), pagination: pagination(query, totalCount) });
}
