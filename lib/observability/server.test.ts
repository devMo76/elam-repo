import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  measureServerOperation,
  observeServerRequest,
} from "./server";

describe("server performance telemetry", () => {
  it("correlates dependency duration with its request and exposes safe headers", async () => {
    const response = await observeServerRequest(
      "instructor.video-status",
      "GET",
      async () => {
        await measureServerOperation("bunny.video.get", "bunny", async () => ({
          status: "ready",
        }));
        return Response.json({ data: { mediaStatus: "ready" } });
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(response.headers.get("server-timing")).toMatch(
      /^app;dur=\d+(?:\.\d+)?, bunny;dur=\d+(?:\.\d+)?$/u,
    );
  });

  it("does not swallow operation failures", async () => {
    await expect(
      measureServerOperation("supabase.catalogue.list", "supabase", async () => {
        throw new TypeError("database unavailable");
      }),
    ).rejects.toThrow(TypeError);
  });
});
