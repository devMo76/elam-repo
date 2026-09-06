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

export const adminOrderStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
  "reversed",
]);

const optionalDateTime = z.iso.datetime({ offset: true }).optional();

export const adminPurchaseHistoryQuerySchema = z
  .strictObject({
    search: z.string().trim().min(1).max(160).optional(),
    status: adminOrderStatusSchema.optional(),
    from: optionalDateTime,
    before: optionalDateTime,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    ({ from, before }) => !from || !before || Date.parse(from) < Date.parse(before),
    { message: "The start date must be earlier than the end date." },
  );

export const adminPurchaseSchema = z.strictObject({
  id: z.uuid(),
  learnerName: z.string().min(1),
  learnerEmail: z.email(),
  courseId: z.uuid(),
  courseTitle: z.string().min(1),
  amountHalalas: nonnegativeSafeInteger,
  currency: z.literal("SAR"),
  status: adminOrderStatusSchema,
  createdAt: z.iso.datetime({ offset: true }),
  paidAt: z.iso.datetime({ offset: true }).nullable(),
  refundedAt: z.iso.datetime({ offset: true }).nullable(),
  reversedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const adminPurchaseHistoryResponseSchema = z.strictObject({
  data: z.array(adminPurchaseSchema),
  pagination: z.strictObject({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    totalCount: nonnegativeSafeInteger,
    totalPages: nonnegativeSafeInteger,
  }),
});

export const adminRevenueQuerySchema = z
  .strictObject({ from: optionalDateTime, before: optionalDateTime })
  .refine(
    ({ from, before }) => !from || !before || Date.parse(from) < Date.parse(before),
    { message: "The start date must be earlier than the end date." },
  );

export const adminCourseRevenueSchema = z.strictObject({
  courseId: z.uuid(),
  courseTitle: z.string().min(1),
  revenueHalalas: nonnegativeSafeInteger,
  paidOrderCount: nonnegativeSafeInteger,
});

export const adminRevenueResponseSchema = z.strictObject({
  data: z.array(adminCourseRevenueSchema),
  totalRevenueHalalas: nonnegativeSafeInteger,
});

export type AdminPurchaseHistoryQuery = z.infer<
  typeof adminPurchaseHistoryQuerySchema
>;
export type AdminRevenueQuery = z.infer<typeof adminRevenueQuerySchema>;
