import { describe, expect, it } from "vitest";

import { getSafeRedirectPath } from "./redirect";

describe("getSafeRedirectPath", () => {
  it("accepts an internal application path", () => {
    expect(getSafeRedirectPath("/auth/reset-password")).toBe(
      "/auth/reset-password",
    );
  });

  it.each([null, "https://evil.example", "//evil.example", "/\\evil"])(
    "rejects unsafe redirect value %s",
    (candidate) => {
      expect(getSafeRedirectPath(candidate)).toBe("/");
    },
  );
});
