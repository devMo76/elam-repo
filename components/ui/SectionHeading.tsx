import type { ReactNode } from "react";

/**
 * Eyebrow, heading, and optional lead paragraph.
 *
 * Factored out because every section on the page needs this trio and six
 * hand-written copies drift: one ends up text-3xl, another text-4xl, the lead
 * measures differ, and the page stops feeling like one document. Restyling all
 * of them is now a single edit.
 *
 * The eyebrow names the section's job before the heading names its content,
 * which gives a scanning reader a second, smaller entry point. It is a <p>
 * rather than a heading element: it is not a level in the document outline,
 * and marking it up as one would put a phantom rung in the heading ladder for
 * a screen-reader user navigating by headings.
 *
 * NO LETTER-SPACING ON THE EYEBROW. Tracking is the reflex for small
 * all-caps Latin labels, and it is actively wrong here: Arabic is a joining
 * script, so positive letter-spacing pulls the connected letterforms of a word
 * apart and breaks the joins. Arabic also has no case, so there is no
 * uppercase treatment to compensate with. Size and colour carry the emphasis
 * instead.
 */
export function SectionHeading({
  eyebrow,
  heading,
  lead,
  align = "center",
}: {
  eyebrow?: string;
  heading: string;
  lead?: ReactNode;
  align?: "center" | "start";
}) {
  const centered = align === "center";

  return (
    <div className={centered ? "text-center" : ""}>
      {eyebrow ? (
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
      ) : null}

      <h2
        className={`text-3xl font-bold text-ink md:text-4xl ${
          eyebrow ? "mt-3" : ""
        }`}
      >
        {heading}
      </h2>

      {/* Measure capped in ch so it holds as the type scale steps up. Centred
          headings need the block centred too, or a short lead sits left of a
          centred heading and reads as a misalignment. */}
      {lead ? (
        <p
          className={`mt-4 max-w-[60ch] text-lg text-body ${
            centered ? "mx-auto" : ""
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
