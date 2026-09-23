import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/server", () => ({
  writePerformanceTelemetry: vi.fn(),
}));

import { POST } from "@/app/api/telemetry/web-vitals/route";
import { writePerformanceTelemetry } from "@/lib/observability/server";

const validPayload = {
  metric: "LCP",
  value: 1_450,
  rating: "good",
  id: "v4-metric-id",
  navigationType: "navigate",
  route: "catalogue",
  device: "mobile",
  release: "f93127e",
  sampleRate: 0.1,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Web Vitals telemetry route", () => {
  it("accepts a privacy-safe allowlisted metric", async () => {
    const response = await POST(
      new Request("https://example.com/api/telemetry/web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(writePerformanceTelemetry).toHaveBeenCalledWith(
      "performance.web_vital",
      validPayload,
    );
  });

  it("rejects pathnames and unexpected personal-content fields", async () => {
    const response = await POST(
      new Request("https://example.com/api/telemetry/web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validPayload,
          pathname: "/courses/private-course-slug",
          email: "learner@example.com",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(writePerformanceTelemetry).not.toHaveBeenCalled();
  });

  it("rejects a declared payload larger than four kilobytes", async () => {
    const response = await POST(
      new Request("https://example.com/api/telemetry/web-vitals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "4097",
        },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(413);
    expect(writePerformanceTelemetry).not.toHaveBeenCalled();
  });
});
