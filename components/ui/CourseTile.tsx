import Link from "next/link";
import type { OfferingCard } from "@/lib/types";
import { nouns, featured } from "@/lib/copy";
import { Num } from "@/components/ui/Num";
import { Counted } from "@/components/ui/Counted";
import { Rule } from "@/components/ui/Rule";
import { Price } from "@/components/ui/Price";
import { Duration } from "@/components/ui/Duration";
import { courseSlug } from "@/lib/slug";

/**
 * Course and instructor on a single tile, per the launch model of one
 * instructor per course.
 *
 * The identifying visual is the course code set large in mono on a tinted
 * band, not photography. A stock photograph per course would misrepresent
 * what is being taught and read as filler; the code is what a student
 * actually searches for.
 *
 * Ratings are intentionally absent. Every mock offering has rating null
 * because the product only permits rating after genuine progress, so the
 * tile must read well without one.
 *
 * Metadata is separated by a hairline rule rather than a middle dot. In Arabic
 * type the middle dot (U+00B7) is very close in shape to the Arabic-Indic zero
 * (U+0660), so "خريج · 3 فصل" reads as "graduate 0 3 terms" when it sits next
 * to numerals. The rule is unambiguous and reads as deliberate.
 */

export function CourseTile({
  card,
  className = "",
}: {
  card: OfferingCard;
  className?: string;
}) {
  const { offering, course, instructor } = card;

  return (
    <Link
      href={`/courses/${courseSlug(course.code)}`}
      className={`group flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-raised hover:border-accent ${className}`}
    >
      <div className="flex items-center justify-between border-b border-hairline bg-tint px-5 py-4">
        <Num className="text-lg font-medium text-ink">{course.code}</Num>

        {offering.previewLessonId ? (
          <span className="rounded-card bg-accent px-2.5 py-1 text-xs font-medium text-on-accent">
            {featured.previewLabel}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl leading-snug font-semibold text-ink">
          {course.titleAr}
        </h3>

        <p className="mt-3 text-base text-body">{instructor.nameAr}</p>
        <p className="mt-1 flex items-center gap-2.5 text-sm text-muted">
          <span>
            <Counted n={instructor.termsTaught} forms={nouns.term} />
          </span>
        </p>

        <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
          <p className="flex items-center gap-2.5 text-sm text-muted">
            <span>
              <Duration minutes={offering.durationMin} />
            </span>
            <Rule />
            <span>
              <Counted n={offering.lessonCount} forms={nouns.lesson} />
            </span>
          </p>

          <Price
            sar={offering.priceSAR}
            className="text-base font-semibold text-ink"
          />
        </div>
      </div>
    </Link>
  );
}
