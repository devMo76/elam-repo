import { z } from "zod";

import {
  courseReadinessSchema,
  type AuthoringCourse,
  type CourseReadiness,
  type CourseReadinessBlocker,
  type CourseReadinessWarning,
  type InstructorAuthoringProfile,
} from "@/lib/contracts";

import { courseSlugSchema } from "../contracts/catalogue";

const courseIdentitySchema = z.strictObject({
  slug: courseSlugSchema,
  title: z.string().trim().min(1).max(160),
  priceHalalas: z.number().int().nonnegative(),
});

const unusuallyShortLessonCount = 1;

const blockerMessages: Record<CourseReadinessBlocker["code"], string> = {
  course_identity_invalid: "Add a valid course title, URL slug, and price.",
  course_module_required: "Add at least one module.",
  course_lesson_required: "Add at least one lesson.",
  lesson_media_not_ready:
    "Wait for the lesson video to become playable or replace it.",
};

type ReadinessLesson = AuthoringCourse["modules"][number]["lessons"][number] & {
  description?: string | null;
};

type ReadinessModule = Omit<AuthoringCourse["modules"][number], "lessons"> & {
  lessons: ReadinessLesson[];
};

type ReadinessCourse = Omit<AuthoringCourse, "modules"> & {
  modules: ReadinessModule[];
};

export type EvaluateCourseReadinessInput = {
  course: ReadinessCourse;
  instructorProfile?: InstructorAuthoringProfile | null;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getCourseReadinessBlockerMessage(
  code: CourseReadinessBlocker["code"],
) {
  return blockerMessages[code];
}

export function evaluateCourseReadiness({
  course,
  instructorProfile,
}: EvaluateCourseReadinessInput): CourseReadiness {
  const blockers: CourseReadinessBlocker[] = [];
  const warnings: CourseReadinessWarning[] = [];
  const lessons = course.modules.flatMap((module) => module.lessons);

  if (
    !courseIdentitySchema.safeParse({
      slug: course.slug,
      title: course.title,
      priceHalalas: course.priceHalalas,
    }).success
  ) {
    blockers.push({
      code: "course_identity_invalid",
      message: getCourseReadinessBlockerMessage("course_identity_invalid"),
      target: "details",
    });
  }

  if (course.modules.length === 0) {
    blockers.push({
      code: "course_module_required",
      message: getCourseReadinessBlockerMessage("course_module_required"),
      target: "curriculum",
    });
  }

  if (lessons.length === 0) {
    blockers.push({
      code: "course_lesson_required",
      message: getCourseReadinessBlockerMessage("course_lesson_required"),
      target: "curriculum",
    });
  }

  for (const lesson of lessons) {
    if (lesson.mediaStatus !== "ready") {
      blockers.push({
        code: "lesson_media_not_ready",
        message: getCourseReadinessBlockerMessage("lesson_media_not_ready"),
        target: "media",
        entityId: lesson.id,
      });
    }

    if (
      Object.hasOwn(lesson, "description") &&
      !hasText(lesson.description)
    ) {
      warnings.push({
        code: "lesson_description_missing",
        message: "Consider adding a description for this lesson.",
        target: "lesson",
        entityId: lesson.id,
      });
    }
  }

  if (!course.coverUrl) {
    warnings.push({
      code: "course_cover_missing",
      message: "Consider adding a course cover image.",
      target: "details",
    });
  }

  if (!hasText(course.subtitle)) {
    warnings.push({
      code: "course_subtitle_missing",
      message: "Consider adding a short course subtitle.",
      target: "details",
    });
  }

  if (!hasText(course.description)) {
    warnings.push({
      code: "course_description_missing",
      message: "Consider adding a course description.",
      target: "details",
    });
  }

  if (
    course.priceHalalas > 0 &&
    !lessons.some((lesson) => lesson.isFreePreview)
  ) {
    warnings.push({
      code: "paid_course_preview_missing",
      message: "Consider making one lesson available as a free preview.",
      target: "curriculum",
    });
  }

  if (lessons.length > 0 && lessons.length <= unusuallyShortLessonCount) {
    warnings.push({
      code: "course_unusually_short",
      message: "This course currently contains only one lesson.",
      target: "curriculum",
    });
  }

  if (instructorProfile !== undefined) {
    if (!instructorProfile?.avatarUrl) {
      warnings.push({
        code: "instructor_avatar_missing",
        message: "Consider adding an instructor profile image.",
        target: "profile",
      });
    }

    if (!hasText(instructorProfile?.headline)) {
      warnings.push({
        code: "instructor_headline_missing",
        message: "Consider adding an instructor headline.",
        target: "profile",
      });
    }

    if (!hasText(instructorProfile?.bio)) {
      warnings.push({
        code: "instructor_bio_missing",
        message: "Consider adding an instructor biography.",
        target: "profile",
      });
    }
  }

  return courseReadinessSchema.parse({
    canSubmit: blockers.length === 0,
    blockers,
    warnings,
  });
}
