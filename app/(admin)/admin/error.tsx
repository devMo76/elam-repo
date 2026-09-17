"use client";

import styles from "@/components/admin/AdminWorkspace.module.css";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.stateViewport}>
      <section className={styles.empty} role="alert">
        <h1>تعذّر تحميل بيانات الإدارة</h1>
        <p>لم تُعرض أي بيانات حسّاسة. حدّث الصفحة أو أعد المحاولة بعد التحقق من اتصال الخدمة.</p>
        <button className={styles.actionButton} onClick={reset} type="button">إعادة المحاولة</button>
      </section>
    </div>
  );
}
