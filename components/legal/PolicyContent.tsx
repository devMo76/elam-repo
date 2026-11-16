import { policySections, policyTitle } from "@/lib/policies";
import styles from "./PolicyContent.module.css";

export function PolicyContent() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{policyTitle}</h1>
      </header>
      <div className={styles.layout}>
        <nav aria-label="محتويات اللائحة" className={styles.contents}>
          <h2>محتويات اللائحة</h2>
          <ul>
            {policySections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ul>
        </nav>
        <article aria-label={policyTitle} className={styles.document}>
          {policySections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
              <h2 id={`${section.id}-heading`}>{section.title}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
