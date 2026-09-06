import { z } from "zod";

const nonnegativeSafeInteger = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

export const adminDashboardSummarySchema = z.strictObject({
  totalRevenueHalalas: nonnegativeSafeInteger,
  enrollmentCount: nonnegativeSafeInteger,
  activeCourseCount: nonnegativeSafeInteger,
});

export const adminDashboardSummaryResponseSchema = z.strictObject({
  data: adminDashboardSummarySchema,
});

export type AdminDashboardSummary = z.infer<
  typeof adminDashboardSummarySchema
>;
