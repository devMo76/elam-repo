import { describe, expect, it } from "vitest";

import { getSafeRedirectPath, getSafeRedirectUrl } from "./redirect";

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

  it("preserves a safe path query and fragment on the configured origin", () => {
    expect(
      getSafeRedirectUrl(
        "https://elam.example",
        "/courses/signals-and-systems?lesson=one#outline",
      ).toString(),
    ).toBe(
      "https://elam.example/courses/signals-and-systems?lesson=one#outline",
    );
  });

  it("never resolves an external callback destination", () => {
    expect(
      getSafeRedirectUrl(
        "https://elam.example",
        "https://evil.example/steal-session",
        "/account",
      ).toString(),
    ).toBe("https://elam.example/account");
  });
});
