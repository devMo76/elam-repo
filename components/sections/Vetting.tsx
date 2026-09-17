import { vetting } from "@/lib/copy";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./Landing.module.css";

/**
 * The credibility argument, and the reason this section exists at all: Elam is
 * not university-affiliated, so the review process has to be visible rather
 * than claimed.
 *
 * Horizontal track that stacks on mobile. Each step is marked by an
 * accent rule along its top edge, which reads as a progression without
 * resorting to numbered badges. Step labels are verbs, never "the first
 * stage", which the spec prohibits as generic step labelling.
 */
/**
 * Columns track the number of steps. A fixed four-column grid left two empty
 * columns once the process was simplified to two steps, which reads as a
 * broken layout rather than as spacing.
 *
 * The length is read into a number-typed local because copy.ts is `as const`,
 * so `steps.length` narrows to the literal 2 and TypeScript rejects the other
 * branches as unreachable. Class names are spelled out in full since Tailwind
 * cannot see interpolated ones.
 */
const stepCount: number = vetting.steps.length;
const stepColumns =
  stepCount >= 4
    ? "md:grid-cols-4"
    : stepCount === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-2";

export function Vetting() {
  return (
    <section
      id="vetting"
      className={`scroll-mt-20 border-b border-hairline ${styles.vetting}`}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 className="max-w-[24ch] text-3xl font-bold text-ink md:text-4xl">
            {vetting.heading}
          </h2>
          <p className="mt-4 max-w-[60ch] text-lg text-body">{vetting.body}</p>
        </Reveal>

        <ol className={`mt-12 grid gap-8 md:gap-6 ${stepColumns} ${styles.vettingTrack}`}>
          {vetting.steps.map((step, i) => (
            <Reveal key={step.label} delay={i * 0.06}>
              <li className={`border-t-2 border-accent pt-5 ${styles.vettingStep}`}>
                <h3 className="text-lg font-semibold text-ink">{step.label}</h3>
                <p className="mt-2 text-base text-body">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
