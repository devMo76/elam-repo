import { catalog } from "@/lib/copy";
import type { CatalogueCourseDetail } from "@/lib/contracts";
import { PublishedCourseTile } from "@/components/ui/PublishedCourseTile";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./Landing.module.css";

/** Tile grid. Collapses to one column below md, two at md, three at lg. */
export function Catalog({ courses }: { courses: CatalogueCourseDetail[] }) {

  return (
    <section
      id="catalog"
      className={`scroll-mt-20 border-b border-hairline ${styles.catalog}`}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 className="text-3xl font-bold text-ink md:text-4xl">
            {catalog.heading}
          </h2>
          <p className="mt-4 max-w-[60ch] text-lg text-body">{catalog.body}</p>
        </Reveal>

        {/* Match the column count to the available courses. */}
        <div
          className={`mt-10 grid gap-6 ${
            courses.length >= 3 ? "md:grid-cols-2 lg:grid-cols-3" : courses.length === 2 ? "md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {courses.map((course, i) => (
            <Reveal
              key={course.id}
              delay={(i % 3) * 0.06}
              className={styles.tileReveal}
            >
              <PublishedCourseTile course={course} className={styles.tile} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
