"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthoringApiError, StudioCourse } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";

function publicationError(payload: AuthoringApiError | null) {
  if (payload?.error?.code === "direct_publish_disabled") {
    return "النشر المباشر غير مفعّل حاليًا. أرسل المقرر للمراجعة بدلًا من ذلك.";
  }

  if (payload?.error?.code === "forbidden") return "لا تملك صلاحية تغيير حالة هذا المقرر.";
  return "تعذّر تغيير حالة المقرر. تحقّق من الاتصال ثم حاول مرة أخرى.";
}

export function InstructorPublicationActions({ course }: { course: StudioCourse }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"submit" | "publish" | null>(null);

  async function changeStatus(action: "submit" | "publish") {
    setError(null);
    setMessage(null);
    setPending(action);

    try {
      const response = await fetch(`/api/instructor/courses/${course.id}/${action}`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { data?: { status: StudioCourse["status"] } } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        setError(publicationError(payload));
        return;
      }

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

  return (
    <div className={styles.publicationControl}>
      <p>بعد مراجعة التفاصيل والمحتوى، أرسل المقرر للمراجعة. وإذا كانت المنصة تتيح النشر المباشر، يمكنك طلب النشر الآن.</p>
      <div className={styles.publicationActions}>
        <button className={styles.primaryButton} disabled={pending !== null} onClick={() => void changeStatus("submit")} type="button">
          {pending === "submit" ? "جارٍ الإرسال…" : "إرسال للمراجعة"}
        </button>
        <button className={styles.textButton} disabled={pending !== null} onClick={() => void changeStatus("publish")} type="button">
          {pending === "publish" ? "جارٍ طلب النشر…" : "طلب النشر المباشر"}
        </button>
      </div>
      {message ? <p className={styles.success} role="status">{message}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
