import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { featured, coursePage, nouns } from "@/lib/copy";
import type { CatalogueCourseDetail } from "@/lib/contracts";
import { Num } from "@/components/ui/Num";
import { Counted } from "@/components/ui/Counted";
import { Rule } from "@/components/ui/Rule";
import { Price } from "@/components/ui/Price";
import { Duration } from "@/components/ui/Duration";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import styles from "./Landing.module.css";

/**
 * One worked example, so the abstract proposition becomes concrete before the
 * visitor reaches the catalogue.
 *
 * Deliberately not a CourseTile. Reusing the tile would make this section and
 * the catalogue share a layout family, which the spec's repetition rule
 * forbids: the catalogue is a grid of vertical tiles, this is a single wide
 * horizontal split. The course code is set at display scale on its own panel
 * rather than as a tile header.
 *
 * The card is a link. It previously was not, which meant the most prominent
 * course promotion on the page was the one thing a reader could not click,
 * while every smaller tile below it navigated.
 *
 * Tinted band. Alternating band tone is what separates sections here; without
 * it the hero's wash runs straight into this section and the page reads as one
 * undifferentiated scroll.
 */
export function FeaturedCourse({
  course,
}: {
  course: CatalogueCourseDetail | undefined;
}) {
  if (!course) return null;

  const hasFreePreview = course.modules.some((module) =>
    module.lessons.some((lesson) => lesson.isFreePreview),
  );

  return (
    <section className={`border-b border-hairline ${styles.featured}`}>
      <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow={featured.eyebrow}
            heading={featured.heading}
            lead={featured.body}
          />
        </Reveal>

        {/* Separate Reveal, slightly behind the heading. Wrapping both in one
            makes the entire section blink in as a single block, which reads as
            a page-load artefact rather than as a section resolving. */}
        <Reveal delay={0.1}>
          <Link
            href={`/courses/${course.slug}`}
            className={`group mx-auto mt-12 block max-w-250 overflow-hidden rounded-card border border-hairline bg-raised hover:border-accent ${styles.featuredCard}`}
          >
            <div className="grid md:grid-cols-[minmax(0,17rem)_1fr]">
              <CourseIdentity
                code={course.courseCode ?? course.department}
                hasPreview={hasFreePreview}
                priceSAR={course.priceHalalas / 100}
              />

              <div className="p-6 md:p-8">
                {/* Summary sits beside the title rather than in the footer.
                    The title is short, so right-aligned it leaves a wide void
                    across the top of this column; the course's own metadata is
                    what naturally belongs there. */}
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                  <div>
                    <h3 className="text-2xl font-semibold text-ink md:text-3xl">
                      {course.title}
                    </h3>

                    <p className="mt-3 text-base text-body">
                      {course.instructor.fullName}
                    </p>
                    {course.instructor.headline ? (
                      <p className="mt-1 text-sm text-muted">
                        {course.instructor.headline}
                      </p>
                    ) : null}
                  </div>

                  <p className="flex items-center gap-2.5 pt-1 text-sm text-muted">
                    <span>
                      <Duration minutes={Math.ceil(course.durationSeconds / 60)} />
                    </span>
                    <Rule />
                    <span>
                      <Counted n={course.lessonCount} forms={nouns.lesson} />
                    </span>
                  </p>
                </div>

                <Curriculum modules={course.modules} />

                {/* Not a nested link -- the whole card is the anchor. This is
                    the visible affordance for it, which hover alone cannot be
                    on a touch device. */}
                <p className="mt-6 flex justify-end">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                    {featured.viewLabel}
                    {/* Points left: "forward" in RTL. transform is physical, so
                        the nudge is a negative X regardless of direction. */}
                    <CaretLeft
                      size={15}
                      weight="bold"
                      aria-hidden
                      className="transition-transform duration-200 group-hover:-translate-x-1"
                    />
                  </span>
                </p>
              </div>
            </div>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The course-code panel.
 *
 * The code is the identifying visual, not photography: a stock photograph per
 * course would misrepresent what is being taught, and the code is what a
 * student actually searches for. Set in mono at display scale, it is also the
 * only place the catalogue's Latin-numeric register appears large enough to
 * read as a graphic element.
 *
 * Sits at the block start when the card stacks, so the code still leads.
 */
function CourseIdentity({
  code,
  hasPreview,
  priceSAR,
}: {
  code: string;
  hasPreview: boolean;
  priceSAR: number | null;
}) {
  return (
    // Solid accent, not tint. The section band is already --tint, so a tinted
    // panel was the same colour as the page behind the card and the card's top
    // half dissolved into the background -- obvious once stacked on mobile,
    // where this panel spans the full width. The fill also does the job the
    // internal divider used to, so there is no border between the halves.
    //
    // Centred as a group, not justify-between: this column's height is set by
    // the detail column beside it, so spreading three short items to the
    // extremes strands ~250px of emptiness down the middle.
    //
    // on-accent on accent measures 9.4:1.
    <div className="flex flex-col items-center justify-center gap-5 bg-accent p-6 text-center md:p-8">
      <Num className="text-4xl font-medium text-on-accent md:text-5xl">
        {code}
      </Num>

      {hasPreview ? (
        <span className="rounded-card bg-on-accent px-2.5 py-1 text-xs font-medium text-accent">
          {featured.previewLabel}
        </span>
      ) : null}

      <Price
        sar={priceSAR}
        className="w-full border-t border-on-accent/25 pt-5 text-2xl font-semibold text-on-accent"
      />
    </div>
  );
}

/**
 * Module breakdown.
 *
 * Real structure rather than five metadata values, which is what made the
 * previous version of this card read as thin. It also previews what is being
 * bought: a reader can see the course is organised rather than a flat pile of
 * videos.
 *
 * The index is decorative -- an ordered list already conveys sequence to a
 * screen reader, so announcing "1" before every title would double it.
 */
function Curriculum({
  modules,
}: {
  modules: CatalogueCourseDetail["modules"];
}) {
  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-muted">{coursePage.curriculum}</p>

      <ol className="mt-3 border-t border-hairline">
        {modules.map((module, i) => (
          <li
            key={module.id}
            className="flex items-center justify-between gap-4 border-b border-hairline py-2.5"
          >
            <span className="flex items-center gap-3 text-base text-body">
              {/* aria-hidden sits on the wrapper, not on Num, which takes only
                  children and a className. */}
              <span aria-hidden className="text-xs text-muted">
                <Num>{i + 1}</Num>
              </span>
              {module.title}
            </span>

            <span className="shrink-0 text-sm text-muted">
              <Counted n={module.lessons.length} forms={nouns.lesson} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
