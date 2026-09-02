import { describe, expect, it } from "vitest";

import {
  changeUserRoleSchema,
  updatePlatformSettingsSchema,
  userIdSchema,
} from "@/lib/admin/schemas";

describe("admin request schemas", () => {
  it("accepts only known application roles", () => {
    expect(changeUserRoleSchema.safeParse({ role: "instructor" }).success).toBe(
      true,
    );
    expect(changeUserRoleSchema.safeParse({ role: "owner" }).success).toBe(
      false,
    );
  });

  it("requires a boolean direct-publishing setting", () => {
    expect(
      updatePlatformSettingsSchema.safeParse({
        instructorDirectPublish: true,
      }).success,
    ).toBe(true);
    expect(
      updatePlatformSettingsSchema.safeParse({
        instructorDirectPublish: "true",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid user identifiers", () => {
    expect(
      userIdSchema.safeParse("10000000-0000-4000-8000-000000000001").success,
    ).toBe(true);
    expect(userIdSchema.safeParse("not-a-user-id").success).toBe(false);
  });
});
