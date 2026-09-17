import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./AdminWorkspace.module.css";

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function AdminMetrics({ children }: { children: ReactNode }) {
  return <section className={styles.metrics}>{children}</section>;
}

export function AdminMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2>{title}</h2>
      {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      {children}
    </section>
  );
}

export function AdminEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className={styles.empty}>
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

export function AdminStatus({ children }: { children: ReactNode }) {
  return <span className={styles.status}>{children}</span>;
}

export function AdminPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  previousHref: string | null;
  nextHref: string | null;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <span>
        صفحة {page} من {totalPages}
      </span>
      <nav aria-label="التنقل بين الصفحات">
        {previousHref ? <Link href={previousHref}>السابقة</Link> : null}
        {nextHref ? <Link href={nextHref}>التالية</Link> : null}
      </nav>
    </div>
  );
}
