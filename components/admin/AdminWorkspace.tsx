"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./AdminWorkspace.module.css";

type ApiError = { error?: { message?: string } };

export function AdminMutationButton({
  action,
  body,
  confirmation,
  endpoint,
}: {
  action: string;
  body: object;
  confirmation: string;
  endpoint: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "تعذّر حفظ التغيير. حدّث الصفحة ثم حاول مرة أخرى.");
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

  if (confirming) {
    return (
      <div className={styles.confirmation} role="group" aria-label={confirmation}>
        <p>{confirmation}</p>
        <div className={styles.confirmationActions}>
          <button className={styles.dangerButton} disabled={isSaving} onClick={save} type="button">
            {isSaving ? "جارٍ الحفظ…" : "تأكيد"}
          </button>
          <button className={styles.quietButton} disabled={isSaving} onClick={() => setConfirming(false)} type="button">
            إلغاء
          </button>
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.mutation}>
      <button className={styles.actionButton} onClick={() => setConfirming(true)} type="button">
        {action}
      </button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
