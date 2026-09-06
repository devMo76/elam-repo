import { getInstructorStatistics } from "@/lib/authoring/statistics";
import { createAuthoringErrorResponse } from "@/lib/authoring/route-response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await getInstructorStatistics();
    return Response.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return createAuthoringErrorResponse(error, "instructor_statistics_failed");
  }
}
