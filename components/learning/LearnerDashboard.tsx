import Link from "next/link";

import type { LearnerCourseProgress, PaymentReturnState } from "@/lib/contracts";

import styles from "./LearnerDashboard.module.css";

const westernNumber = new Intl.NumberFormat("en-US");

const paymentMessages: Record<PaymentReturnState, string> = {
  success: "تم التحقق من الدفع وأُضيفت المادة إلى مكتبتك.",
  pending: "عملية الدفع قيد التحقق. حدّث الصفحة بعد لحظات لرؤية المادة في مكتبتك.",
  failed: "لم تكتمل عملية الدفع. لم تُضف أي مادة إلى مكتبتك.",
  sign_in_required: "سجّل الدخول لإكمال التحقق من عملية الدفع.",
};

export function LearnerDashboard({
  fullName,
  courses,
  paymentState,
}: {
  fullName: string;
  courses: LearnerCourseProgress[];
  paymentState: PaymentReturnState | null;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>أهلًا، {fullName}</h1>
        <p>هذه المواد المسجّل فيها ومسار تقدّمك في كل واحدة منها.</p>
      </header>

      {paymentState ? (
        <p
          aria-live="polite"
          className={`${styles.paymentNotice} ${styles[`payment${paymentState}`]}`}
          role={paymentState === "failed" ? "alert" : "status"}
        >
          {paymentMessages[paymentState]}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="learning-heading">
        <div className={styles.sectionHeader}>
          <h2 id="learning-heading">تعلّمك</h2>
          <span className={styles.count}>
            <bdi dir="ltr">{westernNumber.format(courses.length)}</bdi> مواد
          </span>
        </div>

        {courses.length > 0 ? (
          <div className={styles.courses}>
            {courses.map((course) => {
              const isArchived = course.status === "archived";

              return (
                <article
                  className={isArchived ? styles.course + " " + styles.courseArchived : styles.course}
                  key={course.courseId}
                >
                  <div>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <div className={styles.courseMeta}>
                      <span>
                        <bdi dir="ltr">{westernNumber.format(course.completedLessonCount)}</bdi>
                        {" / "}
                        <bdi dir="ltr">{westernNumber.format(course.lessonCount)}</bdi>
                        {" دروس مكتملة"}
                      </span>
                      {isArchived ? <span>المادة مؤرشفة</span> : null}
                    </div>
                    <div className={styles.courseProgress}>
                      <div className={styles.progressLabel}>
                        <span>التقدّم</span>
                        <bdi dir="ltr">{westernNumber.format(course.completionPercentage)}%</bdi>
                      </div>
                      <progress
                        aria-label={"التقدّم في " + course.title}
                        className={styles.progress}
                        max={100}
                        value={course.completionPercentage}
                      />
                    </div>
                  </div>

                  {isArchived ? (
                    <span className={styles.archived}>مراجعة محفوظة</span>
                  ) : (
                    <Link className={styles.continue} href={"/learn/courses/" + course.courseId}>
                      متابعة التعلّم
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>ما عندك مواد مسجّل فيها حاليًا</h2>
            <p>تقدر تبدأ بالدرس المجاني من صفحة أي مادة منشورة.</p>
            <Link className={styles.browse} href="/courses">
              تصفّح المواد
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export function LearnerDashboardLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="جاري تحميل لوحة التعلّم">
      <div className={styles.skeleton}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
      <div className={styles.section + " " + styles.skeleton}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    </div>
  );
}
