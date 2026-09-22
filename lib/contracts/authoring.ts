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
  slug: courseSlugSchema.optional(),
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

export const createLessonRequestSchema = z.strictObject({
  title: requiredText(160),
});

export const createLessonsRequestSchema = z.union([
  createLessonRequestSchema,
  z.strictObject({
    titles: z.array(requiredText(160)).min(1).max(50),
  }),
]);

export const duplicateLessonRequestSchema = z.strictObject({
  action: z.literal("duplicate"),
});

export const updateLessonRequestSchema = z
  .strictObject({
    title: requiredText(160).optional(),
    isFreePreview: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one lesson field is required.",
  });

export const reorderLessonsRequestSchema = z.strictObject({
  lessonIds: z
    .array(z.uuid())
    .max(1_000)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Lesson IDs must be unique.",
    }),
});

export const authoringLessonSchema = z.strictObject({
  id: z.uuid(),
  moduleId: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  isFreePreview: z.boolean(),
  mediaStatus: z.enum(["absent", "uploading", "processing", "ready", "failed"]),
});

export const authoringModuleSchema = z.strictObject({
  id: z.uuid(),
  courseId: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  lessons: z.array(authoringLessonSchema),
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

export const authoringLessonResponseSchema = z.strictObject({
  data: authoringLessonSchema,
});

export const authoringLessonListResponseSchema = z.strictObject({
  data: z.array(authoringLessonSchema),
});

export const reorderModulesResponseSchema = z.strictObject({
  data: z.strictObject({ moduleIds: z.array(z.uuid()) }),
});

export const reorderLessonsResponseSchema = z.strictObject({
  data: z.strictObject({ lessonIds: z.array(z.uuid()) }),
});

export const authoringCourseStatusResponseSchema = z.strictObject({
  data: z.strictObject({
    courseId: z.uuid(),
    status: authoringCourseStatusSchema,
  }),
});

export const instructorCourseStatisticSchema = z.strictObject({
  courseId: z.uuid(),
  title: z.string().min(1),
  status: authoringCourseStatusSchema,
  enrollmentCount: z.number().int().nonnegative(),
});

export const instructorStatisticsResponseSchema = z.strictObject({
  data: z.array(instructorCourseStatisticSchema),
});

export const updateInstructorProfileRequestSchema = z
  .strictObject({
    avatarUrl: z.url().nullable().optional(),
    headline: optionalText(160).optional(),
    bio: optionalText(2_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

export const instructorAuthoringProfileSchema = z.strictObject({
  id: z.uuid(),
  fullName: z.string().min(1),
  avatarUrl: z.url().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
});

export const instructorAuthoringProfileResponseSchema = z.strictObject({
  data: instructorAuthoringProfileSchema,
});

export const courseReadinessTargetSchema = z.enum([
  "details",
  "curriculum",
  "lesson",
  "media",
  "profile",
]);

export const courseReadinessBlockerCodeSchema = z.enum([
  "course_identity_invalid",
  "course_module_required",
  "course_lesson_required",
  "lesson_media_not_ready",
]);

export const courseReadinessWarningCodeSchema = z.enum([
  "course_cover_missing",
  "course_subtitle_missing",
  "course_description_missing",
  "instructor_avatar_missing",
  "instructor_headline_missing",
  "instructor_bio_missing",
  "paid_course_preview_missing",
  "course_unusually_short",
  "lesson_description_missing",
]);

const courseReadinessIssueFields = {
  message: z.string().min(1),
  target: courseReadinessTargetSchema.optional(),
  entityId: z.uuid().optional(),
};

export const courseReadinessBlockerSchema = z.strictObject({
  code: courseReadinessBlockerCodeSchema,
  ...courseReadinessIssueFields,
});

export const courseReadinessWarningSchema = z.strictObject({
  code: courseReadinessWarningCodeSchema,
  ...courseReadinessIssueFields,
});

export const courseReadinessSchema = z.strictObject({
  canSubmit: z.boolean(),
  blockers: z.array(courseReadinessBlockerSchema),
  warnings: z.array(courseReadinessWarningSchema),
});

export const courseSubmissionReadinessErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.literal("course_not_ready"),
    message: z.string().min(1),
    blockers: z.array(courseReadinessBlockerSchema).min(1),
  }),
});

export type CreateAuthoringCourseRequest = z.infer<
  typeof createAuthoringCourseRequestSchema
>;
export type UpdateAuthoringCourseRequest = z.infer<
  typeof updateAuthoringCourseRequestSchema
>;
export type UpdateLessonRequest = z.infer<typeof updateLessonRequestSchema>;
export type UpdateInstructorProfileRequest = z.infer<
  typeof updateInstructorProfileRequestSchema
>;
export type AuthoringCourse = z.infer<typeof authoringCourseSchema>;
export type InstructorAuthoringProfile = z.infer<
  typeof instructorAuthoringProfileSchema
>;
export type CourseReadiness = z.infer<typeof courseReadinessSchema>;
export type CourseReadinessBlocker = z.infer<
  typeof courseReadinessBlockerSchema
>;
export type CourseReadinessWarning = z.infer<
  typeof courseReadinessWarningSchema
>;
export type CourseSubmissionReadinessErrorResponse = z.infer<
  typeof courseSubmissionReadinessErrorResponseSchema
>;
