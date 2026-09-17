/**
 * Arabic plural selection.
 *
 * Arabic does not have a singular/plural pair. A counted noun takes a
 * different form in six bands, and picking between two forms on `n === 1`
 * gets most of the page wrong:
 *
 *   1        singular              درس
 *   2        dual                  درسان
 *   3-10     plural                دروس
 *   11-99    singular accusative   درسًا      <- not the plural
 *   100+     singular genitive     درس
 *   0        (see the note in copy.ts)
 *
 * The table describes grammatical forms. Display labels in copy.ts may use
 * simpler product wording: lesson counts use "24 درس" without tanween.
 *
 * Intl.PluralRules implements the CLDR categories and ships in Node and every
 * browser, so the band arithmetic is not hand-rolled here. Node has carried
 * full ICU by default since v13; Next 16 requires a far newer Node than that,
 * so the data is guaranteed present.
 *
 * The instance is created once at module scope. Constructing an Intl formatter
 * is not cheap, and these render inside list loops.
 */

const arabic = new Intl.PluralRules("ar");

/** One noun in all six CLDR categories. Every key is required: a missing one
 *  fails on whichever count happens to select it, which is exactly the kind of
 *  gap that ships. */
export type PluralForms = Readonly<Record<Intl.LDMLPluralRule, string>>;

export function pluralize(count: number, forms: PluralForms): string {
  return forms[arabic.select(count)];
}
