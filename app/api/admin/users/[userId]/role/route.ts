import { changeUserRoleSchema, userIdSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return authorization.response;
  }

  const { userId } = await params;
  const parsedUserId = userIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    return createApiError(400, "invalid_user_id", "The user ID is invalid.");
  }

  const parsedBody = await parseJsonBody(request, changeUserRoleSchema);

  if (!parsedBody.success) {
    return parsedBody.response;
  }

  const { error } = await authorization.supabase.rpc("admin_change_user_role", {
    new_role: parsedBody.data.role,
    target_user_id: parsedUserId.data,
  });

  if (error) {
    if (error.code === "P0002") {
      return createApiError(404, "user_not_found", "The user was not found.");
    }

    if (error.code === "22023") {
      return createApiError(
        409,
        "self_role_change_forbidden",
        "Administrators cannot change their own role.",
      );
    }

    return createApiError(403, "role_change_forbidden", "The role was not changed.");
  }

  return Response.json({
    data: {
      id: parsedUserId.data,
      role: parsedBody.data.role,
    },
  });
}
