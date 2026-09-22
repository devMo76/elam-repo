"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AccessibleFormError } from "@/components/ui/AccessibleFormError";
import { useInstructorUnsavedChanges } from "./InstructorNavigationBlocker";
import type { AuthoringApiError, StudioCourse } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";
import { getEditorSaveState } from "@/lib/authoring/editor-state";

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

type CourseFieldErrors = Partial<Record<keyof CourseFields, string>>;

const initialCourseFields: CourseFields = {
  slug: "",
  department: "الهندسة الكهربائية",
  courseCode: "",
  title: "",
  subtitle: "",
  description: "",
  priceRiyals: "0",
  coverUrl: "",
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

function readFieldErrors(payload: AuthoringApiError | null): CourseFieldErrors {
  const fields = payload?.error?.fieldErrors;
  if (!fields) return {};

  const invalid = "تحقّق من هذا الحقل ثم حاول مرة أخرى.";
  return {
    ...(fields.slug ? { slug: invalid } : {}),
    ...(fields.department ? { department: invalid } : {}),
    ...(fields.courseCode ? { courseCode: invalid } : {}),
    ...(fields.title ? { title: invalid } : {}),
    ...(fields.subtitle ? { subtitle: invalid } : {}),
    ...(fields.description ? { description: invalid } : {}),
    ...(fields.priceHalalas ? { priceRiyals: invalid } : {}),
    ...(fields.coverUrl ? { coverUrl: invalid } : {}),
  };
}

function fieldErrorProps(field: keyof CourseFields, errors: CourseFieldErrors) {
  return {
    "aria-describedby": errors[field] ? `course-${field}-error` : undefined,
    "aria-invalid": Boolean(errors[field]),
  } as const;
}

function CourseFieldError({ field, errors }: { field: keyof CourseFields; errors: CourseFieldErrors }) {
  return errors[field] ? <small id={`course-${field}-error`}>{errors[field]}</small> : null;
}

const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPayload(fields: CourseFields, includeSlug: boolean) {
  const priceRiyals = Number(fields.priceRiyals);
  const slug = fields.slug.trim();

  return {
    ...(includeSlug || slug ? { slug } : {}),
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
  creating = false,
  fields,
  fieldErrors,
  onChange,
}: {
  creating?: boolean;
  fields: CourseFields;
  fieldErrors: CourseFieldErrors;
  onChange: (field: keyof CourseFields, value: string) => void;
}) {
  const slugError = fields.slug && !validSlug.test(fields.slug)
    ? "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات فقط."
    : fieldErrors.slug;
  const displayedErrors = { ...fieldErrors, slug: slugError || undefined };

  return (
    <div className={styles.formGroups}>
      <fieldset className={styles.formGroup}>
        <legend>أساسيات المقرر</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>عنوان المقرر</span>
            <input {...fieldErrorProps("title", displayedErrors)} autoComplete="off" onChange={(event) => onChange("title", event.target.value)} required value={fields.title} />
            <CourseFieldError errors={displayedErrors} field="title" />
          </label>
          <label className={styles.field}>
            <span>القسم</span>
            <input {...fieldErrorProps("department", displayedErrors)} autoComplete="off" onChange={(event) => onChange("department", event.target.value)} required value={fields.department} />
            <CourseFieldError errors={displayedErrors} field="department" />
          </label>
          <label className={styles.field}>
            <span>رمز المقرر (اختياري)</span>
            <input {...fieldErrorProps("courseCode", displayedErrors)} autoComplete="off" onChange={(event) => onChange("courseCode", event.target.value)} value={fields.courseCode} />
            <CourseFieldError errors={displayedErrors} field="courseCode" />
          </label>
          <label className={styles.field}>
            <span>السعر بالريال السعودي</span>
            <input {...fieldErrorProps("priceRiyals", displayedErrors)} inputMode="decimal" min="0" onChange={(event) => onChange("priceRiyals", event.target.value)} required step="0.01" type="number" value={fields.priceRiyals} />
            <small>0 للمقرر المجاني.</small>
            <CourseFieldError errors={displayedErrors} field="priceRiyals" />
          </label>
        </div>
      </fieldset>
      <fieldset className={styles.formGroup}>
        <legend>معلومات العرض</legend>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>صورة الغلاف (رابط اختياري)</span>
            <input {...fieldErrorProps("coverUrl", displayedErrors)} autoCapitalize="none" inputMode="url" onChange={(event) => onChange("coverUrl", event.target.value)} placeholder="https://…" type="url" value={fields.coverUrl} />
            <CourseFieldError errors={displayedErrors} field="coverUrl" />
          </label>
          <label className={`${styles.field} ${styles.wideField}`}>
            <span>وصف قصير (اختياري)</span>
            <input {...fieldErrorProps("subtitle", displayedErrors)} autoComplete="off" onChange={(event) => onChange("subtitle", event.target.value)} value={fields.subtitle} />
            <CourseFieldError errors={displayedErrors} field="subtitle" />
          </label>
          <label className={`${styles.field} ${styles.wideField}`}>
            <span>وصف المقرر (اختياري)</span>
            <textarea {...fieldErrorProps("description", displayedErrors)} onChange={(event) => onChange("description", event.target.value)} rows={6} value={fields.description} />
            <CourseFieldError errors={displayedErrors} field="description" />
          </label>
        </div>
      </fieldset>
      <details className={styles.advancedFields}>
        <summary>خيارات متقدمة</summary>
        <label className={styles.field}>
          <span>{creating ? "تخصيص رابط المقرر (اختياري)" : "رابط المقرر"}</span>
          <input {...fieldErrorProps("slug", displayedErrors)} autoCapitalize="none" autoComplete="off" dir="ltr" maxLength={120} onChange={(event) => onChange("slug", event.target.value.toLowerCase())} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder={creating ? "يُنشأ تلقائيًا من العنوان" : undefined} required={!creating} value={fields.slug} />
          <CourseFieldError errors={displayedErrors} field="slug" />
        </label>
      </details>
    </div>
  );
}

export function InstructorCourseCreateForm() {
  const router = useRouter();
  const [fields, setFields] = useState<CourseFields>(initialCourseFields);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = useMemo(() => JSON.stringify(fields) !== JSON.stringify(initialCourseFields), [fields]);
  useInstructorUnsavedChanges(isDirty);

  function changeField(field: keyof CourseFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsSaving(true);

    try {
      const response = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(fields, false)),
      });
      const payload = (await response.json().catch(() => null)) as { data?: StudioCourse } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        setFieldErrors(readFieldErrors(payload));
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
      <CourseFieldsForm creating fieldErrors={fieldErrors} fields={fields} onChange={changeField} />
      <div className={styles.formFooter}>
        <p className={isDirty ? styles.unsaved : undefined}>{isDirty ? "توجد بيانات غير محفوظة" : "سيُنشأ المقرر كمسودة."}</p>
        <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "جارٍ إنشاء المسودة…" : "إنشاء المسودة"}</button>
      </div>
      {error ? <AccessibleFormError className={styles.error}>{error}</AccessibleFormError> : null}
    </form>
  );
}

export function InstructorCourseDetailsForm({
  course,
  onSaved,
}: {
  course: StudioCourse;
  onSaved?: (course: StudioCourse) => void;
}) {
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
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFields, setSavedFields] = useState(fields);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isDirty = useMemo(() => JSON.stringify(fields) !== JSON.stringify(savedFields), [fields, savedFields]);
  const saveState = getEditorSaveState({ dirty: isDirty, saving: isSaving, saved, failed: error !== null });
  useInstructorUnsavedChanges(isDirty);

  function changeField(field: keyof CourseFields, value: string) {
    setSaved(false);
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/instructor/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(fields, true)),
      });
      const payload = (await response.json().catch(() => null)) as ({ data?: StudioCourse } & AuthoringApiError) | null;

      if (!response.ok || !payload?.data) {
        setFieldErrors(readFieldErrors(payload));
        setError(readError(payload));
        return;
      }

      onSaved?.(payload.data);
      setSavedFields(fields);
      setLastSavedAt(new Date());
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
      <CourseFieldsForm fieldErrors={fieldErrors} fields={fields} onChange={changeField} />
      <div className={styles.formFooter}>
        <p className={saveState === "dirty" || saveState === "failed" ? styles.unsaved : styles.saveStatus} role="status">
          {saveState === "saving"
            ? "جارٍ حفظ التغييرات…"
            : saveState === "failed"
              ? "لم تُحفظ التغييرات — حاول مرة أخرى"
              : saveState === "dirty"
                ? "توجد تغييرات غير محفوظة"
                : saveState === "saved" && lastSavedAt
                  ? `حُفظت الآن، ${lastSavedAt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`
                  : "جميع التغييرات محفوظة"}
        </p>
        <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "جارٍ الحفظ…" : "حفظ التفاصيل"}</button>
      </div>
      {error ? <AccessibleFormError className={styles.error}>{error}</AccessibleFormError> : null}
    </form>
  );
}
