import { PublicShell } from "@/components/marketing/PublicShell";

import styles from "./page.module.css";

export default function CourseLoading() {
  return (
    <PublicShell>
      <div className={styles.main} aria-busy="true" aria-label="جارٍ تحميل المادة">
        <div className={styles.back}>جارٍ تحميل المادة…</div>
        <section className={styles.hero}>
          <div>
            <div className="h-4 w-24 animate-pulse rounded bg-[#edeaff]" />
            <div className="mt-6 h-24 max-w-xl animate-pulse rounded bg-[#edeaff]" />
          </div>
          <div className="h-52 animate-pulse rounded-[1.25rem] bg-[#edeaff]" />
        </section>
      </div>
    </PublicShell>
  );
}
