import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./InstructorWorkspace.module.css";

export function InstructorPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <Link className={styles.primaryLink} href={action.href}>{action.label}</Link> : null}
    </header>
  );
}

export function InstructorSection({
  title,
  description,
  action,
  id,
  children,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  id?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <Link className={styles.secondaryLink} href={action.href}>{action.label}</Link> : null}
      </div>
      {children}
    </section>
  );
}

export function InstructorEmptyState({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <section className={styles.empty}>
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <Link className={styles.primaryLink} href={action.href}>{action.label}</Link> : null}
    </section>
  );
}

export { styles as instructorWorkspaceStyles };
