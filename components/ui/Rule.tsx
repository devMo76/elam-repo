/**
 * Vertical hairline separating inline metadata items.
 *
 * Used instead of a middle dot. In Arabic type the middle dot (U+00B7) is very
 * close in shape to the Arabic-Indic zero (U+0660), so a line like
 * "خريج · 3 فصل" reads as "graduate 0 3 terms" when it sits beside numerals.
 * The rule carries no such ambiguity.
 *
 * Decorative, so it is hidden from assistive technology. Parent must be a
 * flex container with a gap.
 */
export function Rule() {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-hairline" />;
}
