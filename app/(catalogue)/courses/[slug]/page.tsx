import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicShell } from "@/components/marketing/PublicShell";
import { FreeCourseEnrollmentButton } from "@/components/catalogue/FreeCourseEnrollmentButton";
import { PaidCourseCheckoutButton } from "@/components/catalogue/PaidCourseCheckoutButton";
import { formatArabicLessonCount } from "@/lib/catalogue/presentation";
import { getCatalogueCourseBySlug } from "@/lib/catalogue/queries";

import styles from "./page.module.css";

const sarFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 0,
});

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await getCatalogueCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const firstFreePreview = course.modules
    .flatMap((module) => module.lessons)
    .find((lesson) => lesson.isFreePreview);
  const isFreeCourse = course.priceHalalas === 0;

  return (
    <PublicShell>
      <main className={styles.main}>
        <Link className={styles.back} href="/courses">
          المواد المتوفرة ←
        </Link>

        <section className={styles.hero}>
          <div className={styles.courseSummary}>
            <span className={styles.courseCode} dir="ltr">
              {course.courseCode ?? course.department}
            </span>
            <h1>{course.title}</h1>
            {course.subtitle ? <p className={styles.subtitle}>{course.subtitle}</p> : null}
            {course.description ? (
              <p className={styles.description}>{course.description}</p>
            ) : null}
          </div>

          <aside className={styles.purchase} id="course-actions">
            <p>{isFreeCourse ? "مادة مجانية" : "سعر المادة"}</p>
            <strong>{isFreeCourse ? "مجاناً" : sarFormatter.format(course.priceHalalas / 100)}</strong>
            <span>
              {course.isEnrolled
                ? "أنت مسجل في هذه المادة."
                : isFreeCourse
                  ? "كل دروس هذه المادة متاحة لك مجاناً."
                : "تصفح المنهج والدروس المجانية قبل التسجيل."}
            </span>
            {course.isEnrolled ? (
              <Link className={styles.learningCta} href={"/learn/courses/" + course.id}>
                متابعة التعلّم
              </Link>
            ) : isFreeCourse ? (
              <FreeCourseEnrollmentButton courseId={course.id} courseSlug={course.slug} />
            ) : (
              <PaidCourseCheckoutButton courseId={course.id} />
            )}
            {!course.isEnrolled && !isFreeCourse && firstFreePreview ? (
              <Link
                className={styles.previewCta}
                href={"/learn/courses/" + course.id + "?lesson=" + firstFreePreview.id}
              >
                شاهد الدرس المجاني
              </Link>
            ) : null}
            {!course.isEnrolled && !isFreeCourse ? (
              <p className={styles.paymentNote}>
                يضاف الاشتراك إلى مكتبتك تلقائيًا بعد تأكيد الدفع.
              </p>
            ) : null}
            <a className={styles.syllabusLink} href="#syllabus">
              {course.isEnrolled ? "راجع المنهج" : "شاهد الدروس المتاحة"}
            </a>
          </aside>
        </section>

        <div className={styles.content}>
          <section className={styles.syllabus} id="syllabus">
            <p className={styles.sectionLabel}>المنهج</p>
            <h2>الدروس مرتبة كما تحتاجها المادة</h2>
            {course.modules.length > 0 ? (
              <ol className={styles.modules}>
                {course.modules.map((module) => (
                  <li key={module.id}>
                    <div className={styles.moduleHeading}>
                      <h3>{module.title}</h3>
                      <span>{formatArabicLessonCount(module.lessons.length)}</span>
                    </div>
                    {module.lessons.length > 0 ? (
                      <ol>
                        {module.lessons.map((lesson) => {
                          const canOpenLesson = course.isEnrolled || lesson.isFreePreview;
                          const href = canOpenLesson
                            ? `/learn/courses/${course.id}?lesson=${lesson.id}`
                            : "#course-actions";

                          return (
                            <li key={lesson.id}>
                              <Link className={canOpenLesson ? styles.lessonLink : styles.lessonLocked} href={href}>
                                <span>{lesson.title}</span>
                                {lesson.isFreePreview ? <em>درس مجاني</em> : null}
                                {!canOpenLesson ? <small>يتطلب التسجيل</small> : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p>الدروس قيد التجهيز.</p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>المنهج قيد التجهيز.</p>
            )}
          </section>

          <aside className={styles.instructor}>
            <p className={styles.sectionLabel}>عن المدرّس</p>
            <h2>{course.instructor.fullName}</h2>
            {course.instructor.headline ? <strong>{course.instructor.headline}</strong> : null}
            {course.instructor.bio ? <p>{course.instructor.bio}</p> : null}
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
