import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiErrorResponseSchema } from "@/lib/contracts";

import { parseJsonBody } from "./api-response";

const requestSchema = z.strictObject({ name: z.string().min(2) });

describe("parseJsonBody", () => {
  it("returns parsed data for valid JSON", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ name: "Elam" }),
    });

    const result = await parseJsonBody(request, requestSchema);

    expect(result).toEqual({ success: true, data: { name: "Elam" } });
  });

  it("returns the shared error shape for malformed JSON", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: "{",
    });

    const result = await parseJsonBody(request, requestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      expect(
        apiErrorResponseSchema.safeParse(await result.response.json()).success,
      ).toBe(true);
    }
  });

  it("returns field errors for invalid input", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });

    const result = await parseJsonBody(request, requestSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(422);
      expect(await result.response.json()).toMatchObject({
        error: {
          code: "validation_failed",
          fieldErrors: { name: expect.any(Array) },
        },
      });
    }
  });
});
