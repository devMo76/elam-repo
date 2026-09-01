import { z } from "zod";

import {
  catalogueCourseDetailSchema,
  catalogueCourseSummarySchema,
  instructorPublicProfileSchema,
  type CatalogueCourseDetail,
  type CatalogueCourseSummary,
} from "@/lib/contracts/catalogue";

const rawInstructorSchema = z.strictObject({
  id: z.uuid(),
  full_name: z.string().min(1),
  avatar_url: z.url().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
});

const rawLessonSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  is_free_preview: z.boolean(),
});

const rawModuleSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1),
  position: z.number().int().positive(),
  lessons: z.array(rawLessonSchema),
});

const rawCourseBaseShape = {
  id: z.uuid(),
  slug: z.string(),
  department: z.string().min(1),
  course_code: z.string().min(1).nullable(),
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  price_halalas: z.number().int().nonnegative(),
  currency: z.string(),
  cover_url: z.url().nullable(),
  instructor: rawInstructorSchema,
};

const rawCourseSummarySchema = z.strictObject({
  ...rawCourseBaseShape,
  modules: z.array(
    z.strictObject({
      lessons: z.array(
        z.strictObject({
          duration_seconds: z.number().int().nonnegative().nullable(),
        }),
      ),
    }),
  ),
});

const rawCourseSchema = z.strictObject({
  ...rawCourseBaseShape,
  description: z.string().nullable(),
  status: z.enum(["draft", "in_review", "published", "archived"]),
  modules: z.array(rawModuleSchema),
});

export type RawCatalogueCourseSummary = z.infer<
  typeof rawCourseSummarySchema
>;
export type RawCatalogueCourse = z.infer<typeof rawCourseSchema>;

function mapInstructor(instructor: RawCatalogueCourse["instructor"]) {
  return instructorPublicProfileSchema.parse({
    id: instructor.id,
    fullName: instructor.full_name,
    avatarUrl: instructor.avatar_url,
    headline: instructor.headline,
    bio: instructor.bio,
  });
}

function mapModules(modules: RawCatalogueCourse["modules"]) {
  return [...modules]
    .sort((first, second) => first.position - second.position)
    .map((module) => ({
      id: module.id,
      title: module.title,
      position: module.position,
      lessons: [...module.lessons]
        .sort((first, second) => first.position - second.position)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          position: lesson.position,
          durationSeconds: lesson.duration_seconds,
          isFreePreview: lesson.is_free_preview,
        })),
    }));
}

function summarizeLessons(modules: RawCatalogueCourseSummary["modules"]) {
  return modules.reduce(
    (courseTotal, module) =>
      module.lessons.reduce(
        (moduleTotal, lesson) => ({
          durationSeconds:
            moduleTotal.durationSeconds + (lesson.duration_seconds ?? 0),
          lessonCount: moduleTotal.lessonCount + 1,
        }),
        courseTotal,
      ),
    { durationSeconds: 0, lessonCount: 0 },
  );
}

export function parseRawCatalogueCourseSummary(
  value: unknown,
): RawCatalogueCourseSummary {
  return rawCourseSummarySchema.parse(value);
}

export function parseRawCatalogueCourse(value: unknown): RawCatalogueCourse {
  return rawCourseSchema.parse(value);
}

export function toCatalogueCourseSummary(
  rawCourse: RawCatalogueCourseSummary,
  isEnrolled: boolean,
): CatalogueCourseSummary {
  const totals = summarizeLessons(rawCourse.modules);

  return catalogueCourseSummarySchema.parse({
    id: rawCourse.id,
    slug: rawCourse.slug,
    department: rawCourse.department,
    courseCode: rawCourse.course_code,
    title: rawCourse.title,
    subtitle: rawCourse.subtitle,
    priceHalalas: rawCourse.price_halalas,
    currency: rawCourse.currency,
    coverUrl: rawCourse.cover_url,
    ...totals,
    instructor: mapInstructor(rawCourse.instructor),
    isEnrolled,
  });
}

export function toCatalogueCourseDetail(
  rawCourse: RawCatalogueCourse,
  isEnrolled: boolean,
): CatalogueCourseDetail {
  const modules = mapModules(rawCourse.modules);
  const summarySource = parseRawCatalogueCourseSummary({
    id: rawCourse.id,
    slug: rawCourse.slug,
    department: rawCourse.department,
    course_code: rawCourse.course_code,
    title: rawCourse.title,
    subtitle: rawCourse.subtitle,
    price_halalas: rawCourse.price_halalas,
    currency: rawCourse.currency,
    cover_url: rawCourse.cover_url,
    instructor: rawCourse.instructor,
    modules: rawCourse.modules.map((module) => ({
      lessons: module.lessons.map((lesson) => ({
        duration_seconds: lesson.duration_seconds,
      })),
    })),
  });

  return catalogueCourseDetailSchema.parse({
    ...toCatalogueCourseSummary(summarySource, isEnrolled),
    description: rawCourse.description,
    visibility: rawCourse.status === "published" ? "public" : "preview",
    modules,
  });
}
