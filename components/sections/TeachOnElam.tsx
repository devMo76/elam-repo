import { ArrowLeft, ChalkboardTeacher } from "@phosphor-icons/react/dist/ssr";
import { teach, cta } from "@/lib/copy";
import { AnimatedDisclosure } from "@/components/alternate/AnimatedDisclosure";
import styles from "./Faq.module.css";

/** Teaching invitation paired with the original homepage's FAQs. */
export function TeachOnElam() {
  return (
    <aside
      id="teach"
      aria-labelledby="teach-heading"
      className={styles.teach}
      data-reveal
      data-reveal-delay="90"
    >
      <ChalkboardTeacher size={44} weight="duotone" aria-hidden />
      <h2 id="teach-heading">{teach.heading}</h2>
      <p>{teach.body}</p>
      <AnimatedDisclosure
        title={cta.teach}
        icon={<ArrowLeft size={20} aria-hidden />}
        className={styles.application}
      >
        <p>{teach.availability}</p>
      </AnimatedDisclosure>
    </aside>
  );
}
