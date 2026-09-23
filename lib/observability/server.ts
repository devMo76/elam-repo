import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type TimingCategory =
  | "internal"
  | "supabase"
  | "moyasar"
  | "bunny"
  | "resend";

type RequestTrace = {
  requestId: string;
  dependencies: Map<TimingCategory, number>;
};

type TelemetryFields = Record<
  string,
  boolean | number | string | null | Record<string, number>
>;

const requestTraceStorage = new AsyncLocalStorage<RequestTrace>();

function telemetryEnabled() {
  return (
    process.env.NODE_ENV !== "test" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.PERFORMANCE_TELEMETRY_ENABLED !== "false"
  );
}

function roundedDuration(startedAt: number) {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export function writePerformanceTelemetry(
  event: string,
  fields: TelemetryFields,
) {
  if (!telemetryEnabled()) return;

  console.info(
    JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}

export async function measureServerOperation<Result>(
  name: string,
  category: TimingCategory,
  operation: () => Promise<Result>,
): Promise<Result> {
  const startedAt = performance.now();
  const trace = requestTraceStorage.getStore();

  try {
    const result = await operation();
    const durationMs = roundedDuration(startedAt);

    if (trace) {
      trace.dependencies.set(
        category,
        (trace.dependencies.get(category) ?? 0) + durationMs,
      );
    }

    writePerformanceTelemetry("performance.server_operation", {
      requestId: trace?.requestId ?? null,
      name,
      category,
      durationMs,
      status: "success",
    });

    return result;
  } catch (error) {
    const durationMs = roundedDuration(startedAt);

    if (trace) {
      trace.dependencies.set(
        category,
        (trace.dependencies.get(category) ?? 0) + durationMs,
      );
    }

    writePerformanceTelemetry("performance.server_operation", {
      requestId: trace?.requestId ?? null,
      name,
      category,
      durationMs,
      status: "error",
      errorType: errorName(error),
    });

    throw error;
  }
}

export async function observeServerRequest(
  name: string,
  method: string,
  handler: () => Promise<Response>,
) {
  const requestId = randomUUID();
  const startedAt = performance.now();
  const trace: RequestTrace = { requestId, dependencies: new Map() };

  return requestTraceStorage.run(trace, async () => {
    try {
      const response = await handler();
      const durationMs = roundedDuration(startedAt);
      const dependencies = Object.fromEntries(trace.dependencies);
      const timingParts = [`app;dur=${durationMs}`];

      for (const [category, duration] of trace.dependencies) {
        timingParts.push(`${category};dur=${duration}`);
      }

      response.headers.set("Server-Timing", timingParts.join(", "));
      response.headers.set("X-Request-Id", requestId);

      writePerformanceTelemetry("performance.server_request", {
        requestId,
        name,
        method,
        durationMs,
        statusCode: response.status,
        dependencies,
      });

      return response;
    } catch (error) {
      writePerformanceTelemetry("performance.server_request", {
        requestId,
        name,
        method,
        durationMs: roundedDuration(startedAt),
        statusCode: 500,
        dependencies: Object.fromEntries(trace.dependencies),
        errorType: errorName(error),
      });
      throw error;
    }
  });
}
