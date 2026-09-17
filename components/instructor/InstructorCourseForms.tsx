"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AuthoringApiError, StudioCourse } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";

type CourseFields = {
  slug: string;
  department: string;
  courseCode: string;
  title: string;
  subtitle: string;
  description: string;
  priceRiyals: string;
  coverUrl: string;
};

const arabicError = {
  course_slug_conflict: "يوجد مقرر آخر يستخدم هذا الرابط المختصر. اختر رابطًا مختلفًا.",
  validation_failed: "تحقّق من الحقول المطلوبة ومن صيغة الرابط والسعر، ثم حاول مرة أخرى.",
  forbidden: "لا تملك صلاحية تعديل هذا المقرر.",
} as const;

function readError(payload: AuthoringApiError | null) {
  if (payload?.error?.code && payload.error.code in arabicError) {
    return arabicError[payload.error.code as keyof typeof arabicError];
  }

  return "تعذّر حفظ المقرر. تحقّق من الاتصال ثم حاول مرة أخرى.";
}

function toPayload(fields: CourseFields) {
  const priceRiyals = Number(fields.priceRiyals);

  return {
    slug: fields.slug.trim(),
    department: fields.department.trim(),
    courseCode: fields.courseCode.trim() || null,
    title: fields.title.trim(),
    subtitle: fields.subtitle.trim() || null,
    description: fields.description.trim() || null,
    priceHalalas: Number.isFinite(priceRiyals) ? Math.round(priceRiyals * 100) : Number.NaN,
    coverUrl: fields.coverUrl.trim() || null,
  };
}

function CourseFieldsForm({
  fields,
  onChange,
}: {
  fields: CourseFields;
  onChange: (field: keyof CourseFields, value: string) => void;
}) {
  return (
    <div className={styles.formGroups}>
      <fieldset className={styles.formGroup}>
        <legend>أساسيات المقرر</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>عنوان المقرر</span>
            <input autoComplete="off" onChange={(event) => onChange("title", event.target.value)} required value={fields.title} />
          </label>
          <label className={styles.field}>
            <span>القسم</span>
            <input autoComplete="off" onChange={(event) => onChange("department", event.target.value)} required value={fields.department} />
          </label>
          <label className={styles.field}>
            <span>رمز المقرر (اختياري)</span>
            <input autoComplete="off" onChange={(event) => onChange("courseCode", event.target.value)} value={fields.courseCode} />
          </label>
          <label className={styles.field}>
            <span>رابط المقرر المختصر</span>
            <input autoCapitalize="none" autoComplete="off" dir="ltr" onChange={(event) => onChange("slug", event.target.value.toLowerCase())} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={fields.slug} />
            <small>حروف إنجليزية صغيرة وأرقام وشرطات فقط.</small>
          </label>
          <label className={styles.field}>
            <span>السعر بالريال السعودي</span>
            <input inputMode="decimal" min="0" onChange={(event) => onChange("priceRiyals", event.target.value)} required step="0.01" type="number" value={fields.priceRiyals} />
            <small>0 للمقرر المجاني.</small>
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.formGroup}>
        <legend>معلومات العرض</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>صورة الغلاف (رابط اختياري)</span>
            <input autoCapitalize="none" inputMode="url" onChange={(event) => onChange("coverUrl", event.target.value)} placeholder="https://…" type="url" value={fields.coverUrl} />
          </label>
          <label className={`${styles.field} ${styles.wideField}`}>
            <span>وصف قصير (اختياري)</span>
            <input autoComplete="off" onChange={(event) => onChange("subtitle", event.target.value)} value={fields.subtitle} />
          </label>
          <label className={`${styles.field} ${styles.wideField}`}>
            <span>وصف المقرر (اختياري)</span>
            <textarea onChange={(event) => onChange("description", event.target.value)} rows={6} value={fields.description} />
          </label>
        </div>
      </fieldset>
    </div>
  );
}

export function InstructorCourseCreateForm() {
  const router = useRouter();
  const [fields, setFields] = useState<CourseFields>({
    slug: "",
    department: "الهندسة الكهربائية",
    courseCode: "",
    title: "",
    subtitle: "",
    description: "",
    priceRiyals: "0",
    coverUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function changeField(field: keyof CourseFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(fields)),
      });
      const payload = (await response.json().catch(() => null)) as { data?: StudioCourse } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        setError(readError(payload));
        return;
      }

      router.push(`/studio/courses/${payload.data.id}`);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.formPanel} onSubmit={submit}>
      <CourseFieldsForm fields={fields} onChange={changeField} />
      <div className={styles.formFooter}>
        <p>سيُنشأ المقرر كمسودة.</p>
        <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "جارٍ إنشاء المسودة…" : "إنشاء المسودة"}</button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
  );
}

export function InstructorCourseDetailsForm({ course }: { course: StudioCourse }) {
  const [fields, setFields] = useState<CourseFields>({
    slug: course.slug,
    department: course.department,
    courseCode: course.courseCode ?? "",
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    priceRiyals: (course.priceHalalas / 100).toFixed(2),
    coverUrl: course.coverUrl ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function changeField(field: keyof CourseFields, value: string) {
    setSaved(false);
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/instructor/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(fields)),
      });
      const payload = (await response.json().catch(() => null)) as AuthoringApiError;

      if (!response.ok) {
        setError(readError(payload));
        return;
      }

      setSaved(true);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  if (course.status === "archived") {
    return <p className={styles.readOnlyNotice}>هذا المقرر مؤرشف، لذلك لا يمكن تعديل تفاصيله أو محتواه.</p>;
  }

  return (
    <form className={styles.formPanel} onSubmit={submit}>
      <CourseFieldsForm fields={fields} onChange={changeField} />
      <div className={styles.formFooter}>
        {saved ? <p className={styles.success}>حُفظت التغييرات.</p> : null}
        <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "جارٍ الحفظ…" : "حفظ التفاصيل"}</button>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </form>
  );
}
