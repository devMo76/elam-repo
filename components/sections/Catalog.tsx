import { catalog } from "@/lib/copy";
import Link from "next/link";
import type { CatalogueCourseDetail } from "@/lib/contracts";
import { PublishedCourseTile } from "@/components/ui/PublishedCourseTile";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./Landing.module.css";
import { isElectricalEngineeringCourse, selectGeneralEngineeringCourses } from "@/lib/catalogue/homepage-subjects";

/** Tile grid. Collapses to one column below md, two at md, three at lg. */
export function Catalog({ courses }: { courses: CatalogueCourseDetail[] }) {
  const groups = [
    { id: "general-engineering", title: catalog.heading, courses: selectGeneralEngineeringCourses(courses) },
    { id: "electrical-engineering", title: catalog.electricalHeading, courses: courses.filter(isElectricalEngineeringCourse) },
  ];
  return (
    <section
      id="catalog"
      className={`scroll-mt-20 border-b border-hairline ${styles.catalog}`}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-8 md:py-28">
        {groups.map(({ id, title, courses: visibleCourses }) => (
          <section key={id} aria-labelledby={id} className="mb-12 last-of-type:mb-0">
            <Reveal>
              <h2 id={id} className="text-3xl font-bold text-ink md:text-4xl">
                {title}
              </h2>
            </Reveal>

            {/* Match the column count to the available courses. */}
            <div
              className={`mt-10 grid gap-6 ${
                visibleCourses.length >= 3 ? "md:grid-cols-2 lg:grid-cols-3" : visibleCourses.length === 2 ? "md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {visibleCourses.map((course, i) => (
                <Reveal
                  key={course.id}
                  delay={(i % 3) * 0.06}
                  className={styles.tileReveal}
                >
                  <PublishedCourseTile course={course} className={styles.tile} />
                </Reveal>
              ))}
            </div>
            {visibleCourses.length === 0 ? <p className="text-base text-muted">{catalog.empty}</p> : null}
          </section>
        ))}
        <Link href="/courses" className="mt-6 inline-flex min-h-11 items-center rounded-card px-1 font-medium text-accent underline-offset-4 hover:underline">{catalog.browseAll}</Link>
      </div>
    </section>
  );
}
