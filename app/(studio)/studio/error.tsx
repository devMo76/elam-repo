"use client";

import { instructorWorkspaceStyles as styles } from "@/components/instructor/InstructorPage";

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.stateViewport}>
      <section className={styles.notice} role="alert">
        <h1>تعذّر تحميل الاستوديو</h1>
        <p>لم تُعرض أي بيانات خاصة. حدّث الصفحة أو أعد المحاولة بعد التحقق من اتصال الخدمة.</p>
        <button className={styles.primaryLink} onClick={reset} type="button">إعادة المحاولة</button>
      </section>
    </div>
  );
}
