"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminMutationButton } from "./AdminWorkspace";
import styles from "./AdminWorkspace.module.css";

type Role = "learner" | "instructor" | "admin";

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "learner", label: "متعلم" },
  { value: "instructor", label: "مدرّس" },
  { value: "admin", label: "مسؤول" },
];

export function AdminRoleControl({
  currentRole,
  userId,
  userName,
}: {
  currentRole: Role;
  userId: string;
  userName: string;
}) {
  const [role, setRole] = useState<Role>(currentRole);

  return (
    <div className={styles.roleControl}>
      <label className="sr-only" htmlFor={`role-${userId}`}>
        دور {userName}
      </label>
      <select
        className={styles.inlineSelect}
        id={`role-${userId}`}
        onChange={(event) => setRole(event.target.value as Role)}
        value={role}
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {role !== currentRole ? (
        <AdminMutationButton
          action="حفظ الدور"
          body={{ role }}
          confirmation={`سيُغيَّر دور ${userName} إلى ${roleOptions.find((option) => option.value === role)?.label}. هل تريد المتابعة؟`}
          endpoint={`/api/admin/users/${userId}/role`}
        />
      ) : null}
    </div>
  );
}

export function AdminCourseActions({
  canPublish,
  courseId,
  courseTitle,
  currentStatus,
}: {
  canPublish: boolean;
  courseId: string;
  courseTitle: string;
  currentStatus: "draft" | "in_review" | "published" | "archived";
}) {
  const actions = [
    currentStatus !== "published" && canPublish
      ? { status: "published" as const, label: "نشر", confirmation: `سيُنشر مقرر ${courseTitle} ويصبح متاحًا للمتعلمين.` }
      : null,
    currentStatus !== "draft"
      ? { status: "draft" as const, label: "إعادته لمسودة", confirmation: `سيُعاد مقرر ${courseTitle} إلى المسودة ولن يظهر في الكتالوج.` }
      : null,
    currentStatus !== "archived"
      ? { status: "archived" as const, label: "أرشفة", confirmation: `سيُؤرشف مقرر ${courseTitle}. لن يعود متاحًا للمتعلمين الجدد.` }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <div className={styles.actions}>
      {!canPublish && currentStatus !== "published" ? <small className={styles.actionHint}>لا يمكن النشر قبل اكتمال المحتوى والفيديوهات.</small> : null}
      {actions.map((action) => (
        <AdminMutationButton
          action={action.label}
          body={{ status: action.status }}
          confirmation={`${action.confirmation} هل تريد المتابعة؟`}
          endpoint={`/api/admin/courses/${courseId}/status`}
          key={action.status}
        />
      ))}
    </div>
  );
}

type ApiError = { error?: { message?: string } };

export function AdminSettingsForm({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorDirectPublish: value }),
      });
      const payload = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "تعذّر حفظ الإعداد. حدّث الصفحة ثم حاول مرة أخرى.");
        return;
      }

      setConfirming(false);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.settingControl}>
      <label className={styles.settingLabel}>
        <input
          checked={value}
          onChange={(event) => setValue(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>النشر المباشر للمدرّسين</strong>
          <small>عند تفعيله، يمكن للمقرر استيفاء شروط النشر دون انتظار المراجعة اليدوية.</small>
        </span>
      </label>
      {value !== initialValue && !confirming ? (
        <button className={styles.actionButton} onClick={() => setConfirming(true)} type="button">
          حفظ التغيير
        </button>
      ) : null}
      {confirming ? (
        <div className={styles.confirmation} role="group" aria-label="تأكيد تغيير إعداد النشر المباشر">
          <p>سيُطبّق هذا الإعداد على عمليات النشر القادمة. هل تريد المتابعة؟</p>
          <div className={styles.confirmationActions}>
            <button className={styles.dangerButton} disabled={isSaving} onClick={() => void save()} type="button">
              {isSaving ? "جارٍ الحفظ…" : "تأكيد الحفظ"}
            </button>
            <button className={styles.quietButton} disabled={isSaving} onClick={() => setConfirming(false)} type="button">
              إلغاء
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
