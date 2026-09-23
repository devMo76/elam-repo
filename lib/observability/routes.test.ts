import { describe, expect, it } from "vitest";

import { webVitalPayloadSchema } from "./contracts";
import { classifyPerformanceRoute } from "./routes";

describe("performance telemetry contracts", () => {
  it.each([
    ["/", "marketing"],
    ["/courses", "catalogue"],
    ["/courses/signals-and-systems-ee301", "course-detail"],
    ["/auth/sign-in", "auth"],
    ["/dashboard", "learner-dashboard"],
    ["/learn/courses/11111111-1111-4111-8111-111111111111", "course-player"],
    ["/studio", "studio-overview"],
    ["/studio/courses", "studio-courses"],
    ["/studio/courses/new", "studio-course-new"],
    ["/studio/courses/11111111-1111-4111-8111-111111111111", "studio-course-editor"],
    ["/studio/profile", "studio-profile"],
    ["/admin/users", "admin"],
  ])("classifies %s without retaining identifiers", (pathname, expected) => {
    expect(classifyPerformanceRoute(pathname)).toBe(expected);
  });

  it("accepts only the allowlisted low-cardinality Web Vitals payload", () => {
    const payload = {
      metric: "LCP",
      value: 1_250,
      rating: "good",
      id: "v4-telemetry-id",
      navigationType: "navigate",
      route: "course-detail",
      device: "mobile",
      release: "f93127e",
      sampleRate: 0.1,
    };

    expect(webVitalPayloadSchema.parse(payload)).toEqual(payload);
    expect(
      webVitalPayloadSchema.safeParse({
        ...payload,
        pathname: "/courses/private-course-slug",
      }).success,
    ).toBe(false);
  });
});
