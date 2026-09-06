import { describe, expect, it } from "vitest";

import { adminDashboardSummaryResponseSchema } from "./admin";

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
});
