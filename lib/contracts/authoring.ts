import { z } from "zod";

import { courseSlugSchema } from "./catalogue";

const requiredText = (maximum: number) =>
  z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).nullable();

export const authoringCourseStatusSchema = z.enum([
  "draft",
  "in_review",
  "published",
  "archived",
]);

export const createAuthoringCourseRequestSchema = z.strictObject({
  slug: courseSlugSchema,
  department: requiredText(32),
  courseCode: optionalText(32),
  title: requiredText(160),
  subtitle: optionalText(240),
  description: optionalText(10_000),
  priceHalalas: z.number().int().nonnegative(),
  coverUrl: z.url().nullable(),
});

export const updateAuthoringCourseRequestSchema = z
  .strictObject({
    slug: courseSlugSchema.optional(),
    department: requiredText(32).optional(),
    courseCode: optionalText(32).optional(),
    title: requiredText(160).optional(),
    subtitle: optionalText(240).optional(),
    description: optionalText(10_000).optional(),
    priceHalalas: z.number().int().nonnegative().optional(),
    coverUrl: z.url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one course field is required.",
  });

export const createModuleRequestSchema = z.strictObject({
  title: requiredText(160),
});

export const updateModuleRequestSchema = createModuleRequestSchema;

export const reorderModulesRequestSchema = z.strictObject({
  moduleIds: z
    .array(z.uuid())
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Module IDs must be unique.",
    }),
});

export const authoringModuleSchema = z.strictObject({
  id: z.uuid(),
  courseId: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
});

export const authoringCourseSchema = z.strictObject({
  id: z.uuid(),
  slug: courseSlugSchema,
  department: z.string().min(1),
  courseCode: z.string().nullable(),
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  priceHalalas: z.number().int().nonnegative(),
  currency: z.literal("SAR"),
  status: authoringCourseStatusSchema,
  coverUrl: z.url().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  modules: z.array(authoringModuleSchema),
});

export const authoringCourseResponseSchema = z.strictObject({
  data: authoringCourseSchema,
});

export const authoringCourseListResponseSchema = z.strictObject({
  data: z.array(authoringCourseSchema),
});

export const authoringModuleResponseSchema = z.strictObject({
  data: authoringModuleSchema,
});

export const reorderModulesResponseSchema = z.strictObject({
  data: z.strictObject({ moduleIds: z.array(z.uuid()) }),
});

export type CreateAuthoringCourseRequest = z.infer<
  typeof createAuthoringCourseRequestSchema
>;
export type UpdateAuthoringCourseRequest = z.infer<
  typeof updateAuthoringCourseRequestSchema
>;
