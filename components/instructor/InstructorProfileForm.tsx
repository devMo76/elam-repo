"use client";

import { useState, type FormEvent } from "react";

import { AccessibleFormError } from "@/components/ui/AccessibleFormError";

import type { AuthoringApiError } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";

type Profile = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
};

export function InstructorProfileForm({ profile }: { profile: Profile }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"avatarUrl" | "headline" | "bio", string>>
  >({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/instructor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatarUrl.trim() || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as AuthoringApiError | null;

      if (!response.ok) {
        const fields = payload?.error?.fieldErrors;
        setFieldErrors({
          ...(fields?.avatarUrl ? { avatarUrl: "أدخل رابطًا صحيحًا للصورة." } : {}),
          ...(fields?.headline ? { headline: "اختصر النبذة المهنية ثم حاول مرة أخرى." } : {}),
          ...(fields?.bio ? { bio: "اختصر النبذة التعريفية ثم حاول مرة أخرى." } : {}),
        });
        setError(payload?.error?.code === "validation_failed" ? "تحقّق من رابط الصورة وطول النصوص، ثم حاول مرة أخرى." : "تعذّر حفظ الملف العام. تحقّق من الاتصال ثم حاول مرة أخرى.");
        return;
      }

      setSaved(true);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className={styles.formPanel} onSubmit={save}>
      <div className={styles.profileName}>
        <span>الاسم الظاهر</span>
        <strong>{profile.fullName}</strong>
        <small>يتغير الاسم من إعدادات الحساب الموثقة، وليس من الملف العام.</small>
      </div>
      <div className={styles.formGrid}>
        <label className={`${styles.field} ${styles.wideField}`}>
          <span>رابط الصورة الشخصية (اختياري)</span>
          <input aria-describedby={fieldErrors.avatarUrl ? "profile-avatar-error" : undefined} aria-invalid={Boolean(fieldErrors.avatarUrl)} autoCapitalize="none" inputMode="url" onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" type="url" value={avatarUrl} />
          {fieldErrors.avatarUrl ? <small id="profile-avatar-error">{fieldErrors.avatarUrl}</small> : null}
        </label>
        <label className={`${styles.field} ${styles.wideField}`}>
          <span>نبذة مهنية قصيرة</span>
          <input aria-describedby={fieldErrors.headline ? "profile-headline-error" : undefined} aria-invalid={Boolean(fieldErrors.headline)} onChange={(event) => setHeadline(event.target.value)} placeholder="مثال: مدرس هندسة كهربائية" value={headline} />
          {fieldErrors.headline ? <small id="profile-headline-error">{fieldErrors.headline}</small> : null}
        </label>
        <label className={`${styles.field} ${styles.wideField}`}>
          <span>عن المدرّس</span>
          <textarea aria-describedby={fieldErrors.bio ? "profile-bio-error" : undefined} aria-invalid={Boolean(fieldErrors.bio)} onChange={(event) => setBio(event.target.value)} placeholder="عرّف المتعلمين بخبرتك وطريقة تدريسك." rows={7} value={bio} />
          {fieldErrors.bio ? <small id="profile-bio-error">{fieldErrors.bio}</small> : null}
        </label>
      </div>
      <div className={styles.formFooter}>
        <p>{saved ? "حُفظ ملفك العام. ستظهر المعلومات المحدثة في صفحات المقررات." : "هذه المعلومات عامة وتظهر للمتعلمين بجوار مقرراتك المنشورة."}</p>
        <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? "جارٍ الحفظ…" : "حفظ الملف العام"}</button>
      </div>
      {error ? <AccessibleFormError className={styles.error}>{error}</AccessibleFormError> : null}
    </form>
  );
}
