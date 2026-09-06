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

export const adminCourseStatusActionSchema = z.strictObject({
  status: z.enum(["draft", "published", "archived"]),
});

export const adminCourseStatusResponseSchema = z.strictObject({
  data: z.strictObject({
    courseId: z.uuid(),
    status: z.enum(["draft", "published", "archived"]),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
  }),
});

export const adminCourseListQuerySchema = z.strictObject({
  search: z.string().trim().min(1).max(160).optional(),
  status: z.enum(["draft", "in_review", "published", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCourseListResponseSchema = z.strictObject({
  data: z.array(z.strictObject({
    id: z.uuid(), slug: z.string().min(1), courseCode: z.string().nullable(),
    title: z.string().min(1), status: z.enum(["draft", "in_review", "published", "archived"]),
    instructorId: z.uuid(), instructorName: z.string().min(1),
    createdAt: z.iso.datetime({ offset: true }),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.strictObject({
    page: z.number().int().positive(), pageSize: z.number().int().positive().max(100),
    totalCount: nonnegativeSafeInteger, totalPages: nonnegativeSafeInteger,
  }),
});

export type AdminCourseListQuery = z.infer<typeof adminCourseListQuerySchema>;

const adminPaginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export const adminUserListQuerySchema = z.strictObject({
  search: z.string().trim().min(1).max(160).optional(),
  role: z.enum(["learner", "instructor", "admin"]).optional(),
  ...adminPaginationQuery,
});
export const adminUserListResponseSchema = z.strictObject({
  data: z.array(z.strictObject({ id: z.uuid(), fullName: z.string().min(1), email: z.email(), role: z.enum(["learner", "instructor", "admin"]), createdAt: z.iso.datetime({ offset: true }) })),
  pagination: z.strictObject({ page: z.number(), pageSize: z.number(), totalCount: nonnegativeSafeInteger, totalPages: nonnegativeSafeInteger }),
});
export const adminAuditListQuerySchema = z.strictObject({
  action: z.string().trim().min(1).max(100).optional(), ...adminPaginationQuery,
});
export const adminAuditListResponseSchema = z.strictObject({
  data: z.array(z.strictObject({ id: nonnegativeSafeInteger, actorId: z.uuid().nullable(), actorName: z.string().nullable(), action: z.string(), subject: z.string().nullable(), detail: z.unknown().nullable(), createdAt: z.iso.datetime({ offset: true }) })),
  pagination: z.strictObject({ page: z.number(), pageSize: z.number(), totalCount: nonnegativeSafeInteger, totalPages: nonnegativeSafeInteger }),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

export const adminWebhookListQuerySchema = z.strictObject({
  provider: z.enum(["moyasar", "bunny"]).optional(),
  status: z.enum(["received", "completed", "failed"]).optional(),
  ...adminPaginationQuery,
});

export const adminWebhookListResponseSchema = z.strictObject({
  data: z.array(z.strictObject({
    id: nonnegativeSafeInteger,
    provider: z.enum(["moyasar", "bunny"]),
    eventKey: z.string(),
    eventType: z.string(),
    resourceId: z.string().nullable(),
    status: z.enum(["received", "completed", "failed"]),
    attemptCount: z.number().int().positive(),
    requestId: z.string().nullable(),
    lastErrorCode: z.string().nullable(),
    firstReceivedAt: z.iso.datetime({ offset: true }),
    lastReceivedAt: z.iso.datetime({ offset: true }),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
  })),
  pagination: z.strictObject({ page: z.number(), pageSize: z.number(), totalCount: nonnegativeSafeInteger, totalPages: nonnegativeSafeInteger }),
});

export type AdminWebhookListQuery = z.infer<typeof adminWebhookListQuerySchema>;
