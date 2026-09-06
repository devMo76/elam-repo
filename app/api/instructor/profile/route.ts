import { getInstructorProfile, updateInstructorProfile } from "@/lib/authoring/profile";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";
import { updateInstructorProfileRequestSchema } from "@/lib/contracts";
import { parseJsonBody } from "@/lib/http/api-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await getInstructorProfile();
    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "instructor_profile_failed");
  }
}

export async function PATCH(request: Request) {
  const body = await parseJsonBody(request, updateInstructorProfileRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    return Response.json(await updateInstructorProfile(body.data));
  } catch (error) {
    return createAuthoringErrorResponse(error, "instructor_profile_update_failed");
  }
}
