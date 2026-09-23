import { z } from "zod";

export const checkoutRequestSchema = z.strictObject({
  courseId: z.uuid(),
});

export const checkoutResponseSchema = z.strictObject({
  data: z.strictObject({
    orderId: z.uuid(),
    amount: z.number().int().nonnegative(),
    currency: z.literal("SAR"),
    description: z.string().min(1).max(255),
    publishableApiKey: z.string().regex(/^pk_(?:test|live)_[A-Za-z0-9]+$/),
    callbackUrl: z.url(),
    metadata: z.strictObject({
      order_id: z.uuid(),
    }),
  }),
});

export const freeCourseEnrollmentResponseSchema = z.strictObject({
  data: z.strictObject({
    courseId: z.uuid(),
    grantedAt: z.iso.datetime({ offset: true }),
  }),
});

export const paymentReturnStateSchema = z.enum([
  "success",
  "pending",
  "failed",
  "sign_in_required",
]);

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
export type FreeCourseEnrollmentResponse = z.infer<
  typeof freeCourseEnrollmentResponseSchema
>;
export type PaymentReturnState = z.infer<typeof paymentReturnStateSchema>;
