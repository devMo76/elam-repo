import { afterEach, describe, expect, it, vi } from "vitest";

import { logger, observeProviderCall } from "./logger";

afterEach(() => vi.restoreAllMocks());

describe("structured logger", () => {
  it("writes JSON and redacts sensitive values", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("payment.failed", {
      orderId: "order-1",
      authorization: "Bearer private",
      nested: { apiKey: "private" },
    });

    const entry = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      level: "error",
      event: "payment.failed",
      orderId: "order-1",
      authorization: "[REDACTED]",
      nested: { apiKey: "[REDACTED]" },
    });
  });

  it("records provider failures and preserves the original error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = new Error("unavailable");

    await expect(
      observeProviderCall("provider", "operation", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
