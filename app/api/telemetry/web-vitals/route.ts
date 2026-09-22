import { webVitalPayloadSchema } from "@/lib/observability/contracts";
import { writePerformanceTelemetry } from "@/lib/observability/server";

export const runtime = "nodejs";

const maximumPayloadBytes = 4_096;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (declaredLength > maximumPayloadBytes) {
    return Response.json({ error: { code: "payload_too_large" } }, { status: 413 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: "invalid_json" } }, { status: 400 });
  }

  const result = webVitalPayloadSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: { code: "invalid_metric" } }, { status: 422 });
  }

  writePerformanceTelemetry("performance.web_vital", result.data);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
