import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError } from "@/lib/http/api-response";

export const runtime = "nodejs";
// Stale course clients must not grant an instructor-wide permission.
export async function PATCH() {
  const authorization = await requireAdmin();
  if (!authorization.authorized) return authorization.response;
  return createApiError(410, "instructor_permission_required", "Manage published updates from the instructor account.");
}
