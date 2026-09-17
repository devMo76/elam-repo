import Link from "next/link";

import type { CatalogueCourseDetail } from "@/lib/contracts";
import { courseCardCode, formatArabicLessonCount } from "@/lib/catalogue/presentation";

import { featured } from "@/lib/copy";
import { Duration } from "@/components/ui/Duration";
import { Num } from "@/components/ui/Num";
import { Price } from "@/components/ui/Price";
import { Rule } from "@/components/ui/Rule";

function hasFreePreview(course: CatalogueCourseDetail) {
  return course.modules.some((module) =>
    module.lessons.some((lesson) => lesson.isFreePreview),
  );
}

export function PublishedCourseTile({
  course,
  className = "",
}: {
  course: CatalogueCourseDetail;
  className?: string;
}) {
  return (
    <Link
      className={`group flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-raised hover:border-accent ${className}`}
      href={`/courses/${course.slug}`}
    >
      <div className="flex items-center justify-between border-b border-hairline bg-tint px-5 py-4">
        <Num className="text-lg font-medium text-ink">
          {courseCardCode(course.courseCode, course.department)}
        </Num>

        {hasFreePreview(course) ? (
          <span className="rounded-card bg-accent px-2.5 py-1 text-xs font-medium text-on-accent">
            {featured.previewLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl leading-snug font-semibold text-ink">
          {course.title}
        </h3>

        <p className="mt-3 text-base text-body">{course.instructor.fullName}</p>
        {course.instructor.headline ? (
          <p className="mt-1 text-sm text-muted">{course.instructor.headline}</p>
        ) : null}

        <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
          <p className="flex items-center gap-2.5 text-sm text-muted">
            <span>
              <Duration minutes={Math.ceil(course.durationSeconds / 60)} />
            </span>
            <Rule />
            <span>
              {formatArabicLessonCount(course.lessonCount)}
            </span>
          </p>

          <Price
            className="text-base font-semibold text-ink"
            sar={course.priceHalalas / 100}
          />
        </div>
      </div>
    </Link>
  );
}
