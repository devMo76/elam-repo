"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CourseReadiness, CourseReadinessBlocker, CourseReadinessWarning } from "@/lib/contracts";
import type { InstructorPublishingCapability } from "@/lib/authoring/capabilities";
import type { AuthoringApiError, StudioCourse } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";

type ReadinessIssue = CourseReadinessBlocker | CourseReadinessWarning;

const issueLabels: Record<ReadinessIssue["code"], string> = {
  course_identity_invalid: "أكمل عنوان المقرر والرابط المختصر والسعر بصيغة صحيحة.",
  course_module_required: "أضف وحدة واحدة على الأقل.",
  course_lesson_required: "أضف درسًا واحدًا على الأقل.",
  lesson_media_not_ready: "انتظر حتى يصبح فيديو الدرس جاهزًا للمشاهدة أو استبدله.",
  course_cover_missing: "إضافة صورة غلاف تجعل صفحة المقرر أوضح.",
  course_subtitle_missing: "يمكنك إضافة وصف قصير للمقرر.",
  course_description_missing: "يمكنك إضافة وصف تفصيلي للمقرر.",
  instructor_avatar_missing: "يمكنك إضافة صورة لملف المدرّس.",
  instructor_headline_missing: "يمكنك إضافة نبذة مهنية قصيرة.",
  instructor_bio_missing: "يمكنك إضافة سيرة مختصرة للمدرّس.",
  paid_course_preview_missing: "يُفضّل إتاحة درس مجاني لمعاينة المقرر المدفوع.",
  course_unusually_short: "المقرر يحتوي حاليًا على درس واحد فقط.",
  lesson_description_missing: "يمكنك إضافة وصف لهذا الدرس.",
};

function issueHref(issue: ReadinessIssue) {
  if (issue.target === "profile") return "/studio/profile";
  if ((issue.target === "lesson" || issue.target === "media") && issue.entityId) return `#lesson-${issue.entityId}`;
  if (issue.target === "details") return "#course-details";
  return "#curriculum";
}

export function publicationError(payload: AuthoringApiError | null) {
  if (payload?.error?.code === "course_not_ready") {
    return "أكمل المتطلبات الموضحة ثم أرسل المقرر مرة أخرى.";
  }

  if (payload?.error?.code === "direct_publish_disabled") {
    return "النشر المباشر غير مفعّل حاليًا. أرسل المقرر للمراجعة بدلًا من ذلك.";
  }

  if (payload?.error?.code === "forbidden") return "لا تملك صلاحية تغيير حالة هذا المقرر.";
  return "تعذّر تغيير حالة المقرر. تحقّق من الاتصال ثم حاول مرة أخرى.";
}

export function arabicBlockerCount(count: number) {
  if (count === 1) return "متطلب واحد متبقٍ";
  if (count === 2) return "متطلبان متبقيان";
  if (count >= 3 && count <= 10) return `${count.toLocaleString("ar-SA")} متطلبات متبقية`;
  return `${count.toLocaleString("ar-SA")} متطلبًا متبقيًا`;
}

export function PublicationReadinessPanel({
  readiness,
  checking = false,
  forceOpen = false,
}: {
  readiness: CourseReadiness;
  checking?: boolean;
  forceOpen?: boolean;
}) {
  const blocked = readiness.blockers.length > 0;
  const summary = checking
    ? "جارٍ التحقق من جاهزية المقرر…"
    : blocked
      ? `المقرر غير جاهز — ${arabicBlockerCount(readiness.blockers.length)}`
      : readiness.warnings.length > 0
        ? "المقرر جاهز للإرسال — توجد تحسينات اختيارية"
        : "المقرر جاهز للإرسال";

  return (
    <details className={`${styles.readinessPanel}${blocked ? ` ${styles.readinessBlocked}` : ""}`} open={forceOpen || undefined}>
      <summary aria-live="polite">
        <span className={styles.readinessIndicator} aria-hidden="true" />
        <strong>{summary}</strong>
        <span className={styles.readinessDisclosure}>التفاصيل</span>
      </summary>
      <div className={styles.readinessBody}>
        {readiness.blockers.length > 0 ? (
          <div>
            <h3>مطلوب قبل الإرسال</h3>
            <ul>{readiness.blockers.map((issue, index) => <li key={`${issue.code}-${issue.entityId ?? index}`}><a href={issueHref(issue)}>{issueLabels[issue.code]}</a></li>)}</ul>
          </div>
        ) : null}
        {readiness.warnings.length > 0 ? (
          <div>
            <h3>تحسينات اختيارية</h3>
            <ul>{readiness.warnings.map((issue, index) => <li key={`${issue.code}-${issue.entityId ?? index}`}><a href={issueHref(issue)}>{issueLabels[issue.code]}</a></li>)}</ul>
          </div>
        ) : null}
        {!blocked && readiness.warnings.length === 0 ? <p>اكتملت المتطلبات الأساسية ويمكن إرسال المقرر للمراجعة.</p> : null}
      </div>
    </details>
  );
}

export function InstructorPublicationActions({
  capability,
  course,
  readiness,
  onStatusChange,
}: {
  capability: InstructorPublishingCapability;
  course: StudioCourse;
  readiness: CourseReadiness;
  onStatusChange?: (status: StudioCourse["status"]) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"submit" | "publish" | null>(null);
  const [serverBlockers, setServerBlockers] = useState<CourseReadinessBlocker[] | null>(null);

  async function changeStatus(action: "submit" | "publish") {
    setError(null);
    setMessage(null);
    setServerBlockers(null);
    setPending(action);

    try {
      const response = await fetch(`/api/instructor/courses/${course.id}/${action}`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { data?: { status: StudioCourse["status"] } } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        if (payload?.error?.code === "course_not_ready" && payload.error.blockers?.length) {
          setServerBlockers(payload.error.blockers);
        }
        setError(publicationError(payload));
        return;
      }

      onStatusChange?.(payload.data.status);
      setMessage(payload.data.status === "published" ? "نُشر المقرر بنجاح." : "أُرسل المقرر للمراجعة بنجاح.");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setPending(null);
    }
  }

  if (course.status === "archived") {
    return <p className={styles.readOnlyNotice}>المقرر مؤرشف ولا يمكن تغيير حالته من الاستوديو.</p>;
  }

  if (course.status === "published") {
    return <p className={styles.readOnlyNotice}>هذا المقرر منشور. تظهر بنية المحتوى للمتابعة هنا، وتبقى التعديلات محصورة في المسودات.</p>;
  }

  if (course.status === "in_review") {
    return <p className={styles.readOnlyNotice}>أُرسل المقرر للمراجعة. ستظهر حالته الجديدة هنا بعد اعتماد فريق المنصة.</p>;
  }

  return (
    <div className={styles.publicationControl}>
      <PublicationReadinessPanel
        checking={pending === "submit"}
        forceOpen={serverBlockers !== null}
        readiness={serverBlockers ? { canSubmit: false, blockers: serverBlockers, warnings: readiness.warnings } : readiness}
      />
      <div className={styles.publicationActions}>
        <button className={styles.primaryButton} disabled={pending !== null || !readiness.canSubmit} onClick={() => void changeStatus("submit")} type="button">
          {pending === "submit" ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
        </button>
        {capability.canDirectPublish ? (
          <button className={styles.textButton} disabled={pending !== null || !readiness.canSubmit} onClick={() => void changeStatus("publish")} type="button">
            {pending === "publish" ? "جارٍ النشر…" : "نشر مباشرة"}
          </button>
        ) : null}
      </div>
      <p className={styles.capabilityNote}>
        {capability.canDirectPublish
          ? "يمكنك إرسال المقرر للمراجعة أو نشره مباشرة بعد اكتمال المتطلبات."
          : "سيراجع فريق المنصة المقرر بعد إرساله، ثم ينشره عند اعتماده."}
      </p>
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
