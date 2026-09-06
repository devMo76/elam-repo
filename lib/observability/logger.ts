type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const SENSITIVE_FIELD = /authorization|cookie|password|secret|token|api.?key/i;

function safeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_FIELD.test(key)) return "[REDACTED]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) return value.map((item) => safeValue(key, item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        safeValue(nestedKey, nestedValue),
      ]),
    );
  }
  return value;
}

function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, safeValue(key, value)]),
    ),
  };

  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}

export const logger = {
  info(event: string, fields?: LogFields) {
    writeLog("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    writeLog("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    writeLog("error", event, fields);
  },
};

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? "unavailable";
}

export async function observeProviderCall<T>(
  provider: string,
  operation: string,
  action: () => Promise<T>,
) {
  const startedAt = performance.now();
  try {
    const result = await action();
    logger.info("provider.call.completed", {
      provider,
      operation,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    logger.error("provider.call.failed", {
      provider,
      operation,
      durationMs: Math.round(performance.now() - startedAt),
      error,
    });
    throw error;
  }
}
