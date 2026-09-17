"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./CourseAccessActions.module.css";

type ApiError = { error?: { code?: string } };

export function FreeCourseEnrollmentButton({ courseId, courseSlug }: { courseId: string; courseSlug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function enroll() {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as ApiError | null;
      if (response.status === 401) {
        router.push(`/auth/sign-in?next=${encodeURIComponent(`/courses/${courseSlug}`)}`);
        return;
      }
      if (!response.ok) {
        setError(payload?.error?.code === "email_verification_required" ? "فعّل بريدك الإلكتروني أولًا، ثم أضف المادة إلى مكتبتك." : payload?.error?.code === "learner_required" ? "إضافة المواد متاحة لحساب المتعلّم." : "تعذّر إضافة المادة إلى مكتبتك. حدّث الصفحة ثم حاول مرة أخرى.");
        return;
      }
      router.push(`/learn/courses/${courseId}`);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div className={styles.actionGroup}>
    <button className={styles.primaryAction} disabled={isSubmitting} onClick={enroll} type="button">{isSubmitting ? "جارٍ الإضافة…" : "ابدأ التعلّم"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
