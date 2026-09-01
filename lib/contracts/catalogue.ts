import { z } from "zod";

export const courseSlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const instructorPublicProfileSchema = z.strictObject({
  id: z.uuid(),
  fullName: z.string().min(1),
  avatarUrl: z.url().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
});

export const catalogueLessonSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  isFreePreview: z.boolean(),
});

export const catalogueModuleSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  lessons: z.array(catalogueLessonSchema),
});

export const catalogueCourseSummarySchema = z.strictObject({
  id: z.uuid(),
  slug: courseSlugSchema,
  department: z.string().min(1),
  courseCode: z.string().min(1).nullable(),
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  priceHalalas: z.number().int().nonnegative(),
  currency: z.literal("SAR"),
  coverUrl: z.url().nullable(),
  durationSeconds: z.number().int().nonnegative(),
  lessonCount: z.number().int().nonnegative(),
  instructor: instructorPublicProfileSchema,
  isEnrolled: z.boolean(),
});

export const catalogueCourseDetailSchema = z.strictObject({
  ...catalogueCourseSummarySchema.shape,
  description: z.string().nullable(),
  visibility: z.enum(["public", "preview"]),
  modules: z.array(catalogueModuleSchema),
});

export type InstructorPublicProfile = z.infer<
  typeof instructorPublicProfileSchema
>;
export type CatalogueCourseSummary = z.infer<
  typeof catalogueCourseSummarySchema
>;
export type CatalogueCourseDetail = z.infer<
  typeof catalogueCourseDetailSchema
>;
