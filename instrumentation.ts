import type { Instrumentation } from "next";

export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV !== "test" &&
    process.env.PERFORMANCE_TELEMETRY_ENABLED !== "false"
  ) {
    console.info(
      JSON.stringify({
        event: "performance.instrumentation_ready",
        timestamp: new Date().toISOString(),
        runtime: "nodejs",
      }),
    );
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.PERFORMANCE_TELEMETRY_ENABLED === "false"
  ) {
    return;
  }

  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : null;

  console.error(
    JSON.stringify({
      event: "performance.server_error",
      timestamp: new Date().toISOString(),
      method: request.method,
      route: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      errorType: error instanceof Error ? error.name : "UnknownError",
      digest,
    }),
  );
};
