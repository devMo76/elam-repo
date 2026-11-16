import { vetting } from "@/lib/copy";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./Landing.module.css";

export function Vetting() {
  return (
    <section id="vetting" className={`scroll-mt-20 border-b border-hairline ${styles.vetting}`}>
      <div className="mx-auto max-w-[1400px] px-4 py-20 md:px-8 md:py-28">
        <Reveal>
          <h2 className="max-w-[28ch] text-3xl font-bold text-ink md:text-4xl">{vetting.heading}</h2>
        </Reveal>
        <ul className={`mt-10 grid gap-8 md:grid-cols-2 md:gap-6 ${styles.vettingTrack}`}>
          {vetting.points.map((point, index) => (
            <li key={point} className={`border-t-2 border-accent pt-5 ${styles.vettingStep}`}>
              <Reveal delay={index * 0.06}>
                <p className="text-lg text-body md:text-xl">{point}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
