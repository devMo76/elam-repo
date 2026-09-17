import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { faq } from "@/lib/copy";
import { TeachOnElam } from "./TeachOnElam";
import { PageMotion } from "@/components/alternate/PageMotion";
import { AnimatedDisclosure } from "@/components/alternate/AnimatedDisclosure";
import styles from "./Faq.module.css";

/**
 * Native disclosures enhanced with interruptible animation, paired with the
 * teaching invitation. Keyboard and no-JavaScript operation stay native.
 *
 * This is a conversion section, not boilerplate. The positioning creates the
 * legitimacy objection, so the first entry answers it directly instead of
 * burying it.
 *
 * Icons are imported from @phosphor-icons/react/dist/ssr because the package
 * root is a client entry point and would force this section client-side.
 */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className={styles.section}>
      <PageMotion className={styles.layout}>
        <div data-reveal>
          <h2
            id="faq-heading"
            className="text-3xl font-bold text-ink md:text-4xl"
          >
            {faq.heading}
          </h2>

          <div className="mt-10 divide-y divide-hairline border-y border-hairline">
            {faq.items.map((item) => (
              <AnimatedDisclosure
                key={item.q}
                title={item.q}
                className={styles.question}
                summaryClassName="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-start text-lg font-medium text-ink transition-colors hover:text-accent"
                icon={
                  <CaretDown
                    size={20}
                    weight="bold"
                    aria-hidden
                    className="shrink-0 text-accent transition-transform duration-200"
                  />
                }
              >
                <p className="pb-6 text-base text-body">{item.a}</p>
              </AnimatedDisclosure>
            ))}
          </div>
        </div>
        <TeachOnElam />
      </PageMotion>
    </section>
  );
}
