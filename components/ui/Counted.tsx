import { Num } from "@/components/ui/Num";
import { pluralize, type PluralForms } from "@/lib/plural";

/**
 * A count and its noun, agreeing.
 *
 * Exists so the two can never be written apart. Every site that rendered
 * `<Num>{n}</Num> {units.lesson}` had to remember both the bidi isolation and
 * the inflection, and there are seven of them; a new one that forgets the
 * second reads as broken Arabic to every visitor while looking fine in review.
 *
 * Renders a fragment rather than an element so it can drop into an existing
 * paragraph or table cell without adding a box to the layout.
 */
export function Counted({ n, forms }: { n: number; forms: PluralForms }) {
  return (
    <>
      <Num>{n}</Num> {pluralize(n, forms)}
    </>
  );
}
