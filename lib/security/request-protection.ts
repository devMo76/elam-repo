import { NextResponse, type NextRequest } from "next/server";

type RateRule = {
  pattern: RegExp;
  methods: ReadonlySet<string>;
  limit: number;
  windowMs: number;
};

type RateEntry = { count: number; resetAt: number };

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const rateEntries = new Map<string, RateEntry>();

const rateRules: RateRule[] = [
  {
    pattern: /^\/api\/auth\/(?:sign-in|register|password-reset|password)$/,
    methods: UNSAFE_METHODS,
    limit: 10,
    windowMs: 15 * 60_000,
  },
  {
    pattern: /^\/api\/checkout$/,
    methods: new Set(["POST"]),
    limit: 10,
    windowMs: 60_000,
  },
  {
    pattern: /^\/api\/instructor\/lessons\/[^/]+\/upload$/,
    methods: new Set(["POST"]),
    limit: 10,
    windowMs: 60_000,
  },
  {
    pattern: /^\/api\/lessons\/[^/]+\/progress$/,
    methods: new Set(["POST"]),
    limit: 120,
    windowMs: 60_000,
  },
  {
    pattern: /^\/api\/(?:admin|instructor)\//,
    methods: UNSAFE_METHODS,
    limit: 60,
    windowMs: 60_000,
  },
];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function getClientAddress(request: NextRequest) {
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function rejectCrossSiteMutation(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method) || request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");

  if (fetchSite === "cross-site") {
    return errorResponse(403, "untrusted_origin", "This request origin is not allowed.");
  }

  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return errorResponse(403, "untrusted_origin", "This request origin is not allowed.");
      }
    } catch {
      return errorResponse(403, "untrusted_origin", "This request origin is not allowed.");
    }
  }

  return null;
}

function enforceRateLimit(request: NextRequest) {
  const rule = rateRules.find(
    ({ pattern, methods }) =>
      methods.has(request.method) && pattern.test(request.nextUrl.pathname),
  );

  if (!rule) return null;

  const now = Date.now();
  const key = `${getClientAddress(request)}:${request.method}:${request.nextUrl.pathname}`;
  const current = rateEntries.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + rule.windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };

  rateEntries.set(key, entry);

  if (rateEntries.size > 10_000) {
    for (const [storedKey, storedEntry] of rateEntries) {
      if (storedEntry.resetAt <= now) rateEntries.delete(storedKey);
    }
  }

  if (entry.count <= rule.limit) return null;

  const response = errorResponse(429, "rate_limited", "Too many requests. Please try again later.");
  response.headers.set("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
  return response;
}

export function protectRequest(request: NextRequest) {
  return rejectCrossSiteMutation(request) ?? enforceRateLimit(request);
}

export function resetRequestProtectionForTests() {
  rateEntries.clear();
}
