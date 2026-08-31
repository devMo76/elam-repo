import { z } from "zod";

export const userRoleSchema = z.enum(["learner", "instructor", "admin"]);

export const changeUserRoleSchema = z.strictObject({
  role: userRoleSchema,
});

export const updatePlatformSettingsSchema = z.strictObject({
  instructorDirectPublish: z.boolean(),
});

export const userIdSchema = z.uuid();
