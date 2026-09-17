import Link from "next/link";

import type { CatalogueCourseSummary } from "@/lib/contracts/catalogue";
import {
  courseCardCode,
  formatArabicLessonCount,
} from "@/lib/catalogue/presentation";
import { formatArabicMinutes } from "@/lib/format";
import styles from "./CourseCard.module.css";

const sarFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
});

export function CourseCard({ course }: { course: CatalogueCourseSummary }) {
  const duration = formatArabicMinutes(course.durationSeconds / 60);
  const numericDuration = /^(\d+)\s+(.+)$/u.exec(duration);

  return (
    <Link className={styles.card} href={`/courses/${course.slug}`}>
      <div className={styles.cardHeader}>
        <span className={styles.code} dir="ltr">
          {courseCardCode(course.courseCode, course.department)}
        </span>
        {course.priceHalalas === 0 ? <span className={styles.freeBadge}>مجاني</span> : null}
      </div>
      <div className={styles.body}>
        <h2>{course.title}</h2>
        <p className={styles.instructor}>{course.instructor.fullName}</p>
        {course.instructor.headline ? (
          <p className={styles.headline}>{course.instructor.headline}</p>
        ) : null}
        <div className={styles.footer}>
          <p className={styles.meta}>
            {numericDuration ? (
              <span aria-label={duration} className={styles.duration}>
                <bdi dir="ltr">{numericDuration[1]}</bdi>
                <span dir="rtl">{numericDuration[2]}</span>
              </span>
            ) : (
              <span className={styles.duration}>{duration}</span>
            )}
            <span aria-hidden="true" className={styles.rule} />
            <span>{formatArabicLessonCount(course.lessonCount)}</span>
          </p>
          <strong>{course.priceHalalas === 0 ? "مجاني" : sarFormatter.format(course.priceHalalas / 100)}</strong>
        </div>
      </div>
    </Link>
  );
}
