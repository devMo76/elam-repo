import { z } from "zod";

export const performanceRouteSchema = z.enum([
  "marketing",
  "catalogue",
  "course-detail",
  "auth",
  "learner-dashboard",
  "course-player",
  "studio-overview",
  "studio-courses",
  "studio-course-new",
  "studio-course-editor",
  "studio-profile",
  "admin",
  "account",
  "other",
]);

export const webVitalMetricSchema = z.enum(["CLS", "INP", "LCP"]);

export const webVitalPayloadSchema = z.strictObject({
  metric: webVitalMetricSchema,
  value: z.number().finite().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  id: z.string().trim().min(1).max(128),
  navigationType: z.string().trim().min(1).max(32),
  route: performanceRouteSchema,
  device: z.enum(["mobile", "tablet", "desktop"]),
  release: z.string().trim().min(1).max(128),
  sampleRate: z.number().min(0).max(1),
});

export type PerformanceRoute = z.infer<typeof performanceRouteSchema>;
export type WebVitalPayload = z.infer<typeof webVitalPayloadSchema>;
