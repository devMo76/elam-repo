import Image from "next/image";
import styles from "./Logo.module.css";

/**
 * Existing book mark plus the Arabic brand name. Both mark variants are
 * decorative; the containing link supplies the accessible brand name.
 */
export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <span className={`${styles.lockup} ${className}`} aria-hidden="true">
      <span className={styles.mark}>
        <Image
          src="/elam-mark.png"
          alt=""
          fill
          sizes="48px"
          priority
          className={styles.light}
        />
        <Image
          src="/elam-mark-dark.png"
          alt=""
          fill
          sizes="48px"
          className={styles.dark}
        />
      </span>
      <span className={styles.wordmark}>إلام</span>
    </span>
  );
}
