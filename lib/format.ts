/**
 * Formatting helpers.
 *
 * These deliberately return numbers rather than pre-joined strings. Latin
 * numerals and Arabic unit words must be composed in JSX so each numeric run
 * can be wrapped in <Num> and bidi-isolated. Returning "3 س 19 د" as one
 * string would put an un-isolated Latin run inside Arabic text, which the
 * bidi algorithm reorders on render.
 */

export function splitDuration(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

const westernNumber = new Intl.NumberFormat("en-US");

function formatArabicCount(
  count: number,
  singular: string,
  dual: string,
  plural: string,
) {
  const number = westernNumber.format(count);

  if (count === 1) return `${singular} واحدة`;
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${number} ${plural}`;
  return `${number} ${singular}`;
}

export function formatArabicMinutes(totalMinutes: number) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes));

  if (roundedMinutes === 0) return "أقل من دقيقة";

  const { hours, minutes } = splitDuration(roundedMinutes);
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(formatArabicCount(hours, "ساعة", "ساعتان", "ساعات"));
  }

  if (minutes > 0) {
    parts.push(formatArabicCount(minutes, "دقيقة", "دقيقتان", "دقائق"));
  }

  return parts.join(" و");
}
