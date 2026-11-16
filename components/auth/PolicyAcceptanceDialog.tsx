"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENT_POLICY_VERSION } from "@/lib/policy-version";
import { PolicyAgreement } from "./PolicyAgreement";
import styles from "./PolicyAcceptanceDialog.module.css";

export function PolicyAcceptanceDialog({ redirectTo }: { redirectTo: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element?.open) element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(signOut = false) {
    if (busy || (!signOut && !accepted)) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(signOut ? "/api/auth/sign-out" : "/api/auth/policy", {
        method: "POST",
        ...(signOut ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ policyAccepted: true, policyVersion: CURRENT_POLICY_VERSION }) }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? "انتهت جلسة الدخول. سجّل الخروج ثم ادخل مجددًا."
          : signOut ? "تعذر تسجيل الخروج. حاول مرة أخرى." : "تعذر حفظ موافقتك. حاول مرة أخرى.");
        return;
      }
      router.replace(signOut ? "/" : redirectTo);
      router.refresh();
    } catch { setError("تعذر الاتصال. تحقق من اتصالك ثم حاول مرة أخرى."); }
    finally { setBusy(false); }
  }

  return <>
    <noscript>فعّل JavaScript لقراءة طلب الموافقة والمتابعة. يمكنك الاطلاع على اللائحة من رابط التذييل.</noscript>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="policy-dialog-heading"
      aria-describedby="policy-dialog-description" onCancel={event => event.preventDefault()}>
      <h1 id="policy-dialog-heading">الموافقة على لائحة المنصة</h1>
      <p id="policy-dialog-description">للمتابعة في استخدام حسابك، يرجى الاطلاع على لائحة سياسات الخصوصية والاستخدام والموافقة عليها.</p>
      <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <PolicyAgreement checked={accepted} onChange={setAccepted} disabled={busy} />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button disabled={!accepted || busy} type="submit">{busy ? "جارٍ التنفيذ…" : "أوافق وأتابع"}</button>
          <button className={styles.signOut} disabled={busy} onClick={() => void submit(true)} type="button">تسجيل الخروج</button>
        </div>
      </form>
    </dialog>
  </>;
}
