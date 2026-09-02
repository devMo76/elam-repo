import { describe, expect, it } from "vitest";

import {
  checkoutRequestSchema,
  checkoutResponseSchema,
  paymentReturnStateSchema,
} from "@/lib/contracts/payments";

const courseId = "40000000-0000-4000-8000-000000000001";
const orderId = "70000000-0000-4000-8000-000000000001";

describe("payment contracts", () => {
  it("accepts a checkout request containing only a course id", () => {
    expect(checkoutRequestSchema.parse({ courseId })).toEqual({ courseId });
    expect(
      checkoutRequestSchema.safeParse({ courseId, amount: 1 }).success,
    ).toBe(false);
  });

  it("accepts safe payment form parameters", () => {
    expect(
      checkoutResponseSchema.safeParse({
        data: {
          orderId,
          amount: 35000,
          currency: "SAR",
          description: `Elam course order ${orderId}`,
          publishableApiKey: "pk_test_example",
          callbackUrl: "https://example.com/api/payments/callback",
          metadata: { order_id: orderId },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects secret keys and unsupported return states", () => {
    const response = {
      data: {
        orderId,
        amount: 35000,
        currency: "SAR",
        description: `Elam course order ${orderId}`,
        publishableApiKey: "sk_test_not_public",
        callbackUrl: "https://example.com/api/payments/callback",
        metadata: { order_id: orderId },
      },
    };

    expect(checkoutResponseSchema.safeParse(response).success).toBe(false);
    expect(paymentReturnStateSchema.safeParse("paid").success).toBe(false);
  });
});
