import { formatArabicMinutes } from "@/lib/format";
import { Num } from "@/components/ui/Num";

/**
 * Renders a duration, omitting parts that are zero.
 *
 * A 360-minute course is "6 ساعات", not "6 ساعات 0 د". Rendering both parts
 * unconditionally is the kind of detail that reads as unfinished, and it shows
 * up precisely on the round numbers that placeholder content tends to use.
 *
 * Sub-hour durations still show minutes, and a zero-length course shows
 * "0 د" rather than nothing at all.
 */
export function Duration({ minutes: total }: { minutes: number }) {
  const duration = formatArabicMinutes(total);
  const numericDuration = /^(\d+)\s+(.+)$/u.exec(duration);

  if (numericDuration) {
    return (
      <span
        aria-label={duration}
        className="inline-flex items-baseline gap-1 whitespace-nowrap"
        dir="ltr"
      >
        <Num>{numericDuration[1]}</Num>
        <span dir="rtl">{numericDuration[2]}</span>
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap">{duration}</span>
  );
}
