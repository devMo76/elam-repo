import type { Instrumentation } from "next";

import { logger } from "@/lib/observability/logger";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  logger.error("next.request.unhandled_error", {
    error,
    method: request.method,
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
