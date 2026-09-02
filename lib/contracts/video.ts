import { z } from "zod";

export const mediaStatusSchema = z.enum([
  "absent",
  "uploading",
  "processing",
  "ready",
  "failed",
]);

export const directUploadHeadersSchema = z.strictObject({
  AuthorizationSignature: z.string().regex(/^[a-f0-9]{64}$/),
  AuthorizationExpire: z.string().regex(/^\d+$/),
  LibraryId: z.string().regex(/^\d+$/),
  VideoId: z.uuid(),
});

export const directVideoUploadResponseSchema = z.strictObject({
  data: z.strictObject({
    videoId: z.uuid(),
    upload: z.strictObject({
      endpoint: z.literal("https://video.bunnycdn.com/tusupload"),
      expiresAt: z.iso.datetime(),
      headers: directUploadHeadersSchema,
    }),
  }),
});

const bunnyWebhookIntegerSchema = z.preprocess(
  (value) =>
    typeof value === "string" && /^\d+$/.test(value.trim())
      ? Number(value)
      : value,
  z.number().int(),
);

// Bunny owns this external payload and may add fields without notice. Parse
// only the authenticated fields we use instead of rejecting harmless additions.
export const bunnyWebhookSchema = z.object({
  VideoLibraryId: bunnyWebhookIntegerSchema.pipe(z.number().positive()),
  VideoGuid: z.uuid(),
  Status: bunnyWebhookIntegerSchema.pipe(z.number().min(0).max(10)),
});

export const savedLessonProgressSchema = z.strictObject({
  positionSeconds: z.number().int().nonnegative(),
  completedAt: z.iso.datetime().nullable(),
  revision: z.number().int().nonnegative(),
});

export const lessonPlaybackResponseSchema = z.strictObject({
  data: z.strictObject({
    playbackUrl: z.url(),
    expiresAt: z.iso.datetime(),
    progress: savedLessonProgressSchema.nullable(),
  }),
});

export const lessonProgressRequestSchema = z.strictObject({
  positionSeconds: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  markComplete: z.boolean().optional().default(false),
});

export const lessonProgressResponseSchema = z.strictObject({
  data: savedLessonProgressSchema,
});

export const lessonVideoStatusResponseSchema = z.strictObject({
  data: z.strictObject({
    mediaStatus: mediaStatusSchema,
    encodingProgress: z.number().int().min(0).max(100).nullable(),
  }),
});

export const learnerCourseProgressSchema = z.strictObject({
  courseId: z.uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  coverUrl: z.url().nullable(),
  status: z.enum(["published", "archived"]),
  lessonCount: z.number().int().nonnegative(),
  completedLessonCount: z.number().int().nonnegative(),
  completionPercentage: z.number().int().min(0).max(100),
  lastActivityAt: z.iso.datetime().nullable(),
});

export type DirectVideoUploadResponse = z.infer<
  typeof directVideoUploadResponseSchema
>;
export type LessonPlaybackResponse = z.infer<
  typeof lessonPlaybackResponseSchema
>;
export type LessonProgressRequest = z.infer<
  typeof lessonProgressRequestSchema
>;
export type LessonProgressResponse = z.infer<
  typeof lessonProgressResponseSchema
>;
export type LessonVideoStatusResponse = z.infer<
  typeof lessonVideoStatusResponseSchema
>;
export type LearnerCourseProgress = z.infer<
  typeof learnerCourseProgressSchema
>;
