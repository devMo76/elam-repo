const ALLOWED_HOST = /(^localhost$|^127\.0\.0\.1$|staging|preview|\.vercel\.app$)/i;

export function loadTestConfig(environment = process.env) {
  const target = new URL(environment.LOAD_TEST_TARGET_URL ?? "");
  const concurrency = Number(environment.LOAD_TEST_CONCURRENCY ?? 5);
  const durationSeconds = Number(environment.LOAD_TEST_DURATION_SECONDS ?? 15);
  const scenario = environment.LOAD_TEST_SCENARIO ?? "home";

  if (environment.LOAD_TEST_CONFIRM !== "STAGING_ONLY") {
    throw new Error("Set LOAD_TEST_CONFIRM=STAGING_ONLY before running a load test.");
  }
  if (!ALLOWED_HOST.test(target.hostname)) {
    throw new Error("Load tests are restricted to localhost, preview, or staging hosts.");
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 500) {
    throw new Error("LOAD_TEST_CONCURRENCY must be between 1 and 500.");
  }
  if (!Number.isInteger(durationSeconds) || durationSeconds < 5 || durationSeconds > 120) {
    throw new Error("LOAD_TEST_DURATION_SECONDS must be between 5 and 120.");
  }
  if (!["home", "playback", "admin-summary", "progress", "checkout"].includes(scenario)) {
    throw new Error("Unknown load-test scenario.");
  }

  const mutating = scenario === "progress" || scenario === "checkout";
  if (mutating && environment.LOAD_TEST_ALLOW_WRITES !== "YES_I_ACCEPT_TEST_DATA") {
    throw new Error("Mutating scenarios require LOAD_TEST_ALLOW_WRITES=YES_I_ACCEPT_TEST_DATA.");
  }

  const cookie = environment.LOAD_TEST_SESSION_COOKIE;
  if (scenario !== "home" && !cookie) {
    throw new Error("This scenario requires LOAD_TEST_SESSION_COOKIE.");
  }

  const identifier = scenario === "playback" || scenario === "progress"
    ? environment.LOAD_TEST_LESSON_ID
    : scenario === "checkout"
      ? environment.LOAD_TEST_COURSE_ID
      : undefined;
  if ((scenario === "playback" || scenario === "progress" || scenario === "checkout") && !identifier) {
    throw new Error("The selected scenario requires its test resource ID.");
  }

  return { target, concurrency, durationSeconds, scenario, cookie, identifier };
}

export function scenarioRequest(config) {
  const headers = config.cookie ? { Cookie: config.cookie } : {};
  switch (config.scenario) {
    case "home": return { path: "/", options: { headers } };
    case "playback": return { path: `/api/lessons/${config.identifier}/playback`, options: { headers } };
    case "admin-summary": return { path: "/api/admin/summary", options: { headers } };
    case "checkout": return {
      path: "/api/checkout",
      options: { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ courseId: config.identifier }) },
    };
    case "progress": return {
      path: `/api/lessons/${config.identifier}/progress`,
      options: { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ positionSeconds: 0, revision: 0, markComplete: false }) },
    };
    default: throw new Error("Unknown load-test scenario.");
  }
}
