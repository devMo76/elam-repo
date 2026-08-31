import { updatePlatformSettingsSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/auth/authorization";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";

export async function PATCH(request: Request) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return authorization.response;
  }

  const parsedBody = await parseJsonBody(request, updatePlatformSettingsSchema);

  if (!parsedBody.success) {
    return parsedBody.response;
  }

  const { data, error } = await authorization.supabase
    .from("platform_settings")
    .update({
      instructor_direct_publish: parsedBody.data.instructorDirectPublish,
    })
    .eq("id", 1)
    .select("instructor_direct_publish, updated_at, updated_by")
    .single();

  if (error) {
    return createApiError(
      403,
      "settings_update_forbidden",
      "Platform settings were not changed.",
    );
  }

  return Response.json({ data });
}
