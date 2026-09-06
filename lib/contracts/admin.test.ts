import { describe, expect, it } from "vitest";

import {
  adminDashboardSummaryResponseSchema,
  adminCourseStatusActionSchema,
  adminCourseListQuerySchema,
  adminAuditListQuerySchema,
  adminUserListQuerySchema,
  adminPurchaseHistoryQuerySchema,
  adminRevenueQuerySchema,
} from "./admin";

describe("admin contracts", () => {
  it("accepts a valid dashboard summary", () => {
    expect(
      adminDashboardSummaryResponseSchema.parse({
        data: {
          totalRevenueHalalas: 35000,
          enrollmentCount: 12,
          activeCourseCount: 3,
        },
      }),
    ).toEqual({
      data: {
        totalRevenueHalalas: 35000,
        enrollmentCount: 12,
        activeCourseCount: 3,
      },
    });
  });

  it("rejects negative totals and unexpected fields", () => {
    expect(
      adminDashboardSummaryResponseSchema.safeParse({
        data: {
          totalRevenueHalalas: -1,
          enrollmentCount: 12,
          activeCourseCount: 3,
          learnerEmails: ["private@example.invalid"],
        },
      }).success,
    ).toBe(false);
  });

  it("normalizes purchase pagination and validates filters", () => {
    expect(
      adminPurchaseHistoryQuerySchema.parse({ page: "2", pageSize: "25" }),
    ).toMatchObject({ page: 2, pageSize: 25 });
    expect(
      adminPurchaseHistoryQuerySchema.safeParse({ status: "unknown" }).success,
    ).toBe(false);
  });

  it("rejects reversed date ranges", () => {
    expect(
      adminRevenueQuerySchema.safeParse({
        from: "2026-02-01T00:00:00Z",
        before: "2026-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("accepts only admin-controlled destination statuses", () => {
    expect(adminCourseStatusActionSchema.safeParse({ status: "published" }).success).toBe(true);
    expect(adminCourseStatusActionSchema.safeParse({ status: "in_review" }).success).toBe(false);
  });

  it("validates course review filters and pagination", () => {
    expect(adminCourseListQuerySchema.parse({ status: "in_review", page: "2" })).toMatchObject({ status: "in_review", page: 2, pageSize: 20 });
    expect(adminCourseListQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });

  it("validates user and audit directory filters", () => {
    expect(adminUserListQuerySchema.parse({ role: "instructor" })).toMatchObject({ role: "instructor", page: 1, pageSize: 20 });
    expect(adminAuditListQuerySchema.safeParse({ pageSize: "0" }).success).toBe(false);
  });
});
