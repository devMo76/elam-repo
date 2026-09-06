import { describe, expect, it } from "vitest";

import { loadTestConfig, scenarioRequest } from "@/scripts/load/config.mjs";

const safe = { LOAD_TEST_TARGET_URL: "https://elam-staging.vercel.app", LOAD_TEST_CONFIRM: "STAGING_ONLY" };

describe("load test safety", () => {
  it("rejects an unconfirmed run", () => expect(() => loadTestConfig({ LOAD_TEST_TARGET_URL: safe.LOAD_TEST_TARGET_URL })).toThrow());
  it("rejects unrelated production hosts", () => expect(() => loadTestConfig({ ...safe, LOAD_TEST_TARGET_URL: "https://example.com" })).toThrow());
  it("limits concurrency to 500", () => expect(() => loadTestConfig({ ...safe, LOAD_TEST_CONCURRENCY: "501" })).toThrow());
  it("keeps home testing read-only", () => {
    const config = loadTestConfig(safe);
    expect(scenarioRequest(config)).toMatchObject({ path: "/", options: { headers: {} } });
  });
  it("requires explicit permission for checkout writes", () => expect(() => loadTestConfig({ ...safe, LOAD_TEST_SCENARIO: "checkout", LOAD_TEST_SESSION_COOKIE: "session", LOAD_TEST_COURSE_ID: "course" })).toThrow());
});
