import { units, placeholder } from "@/lib/copy";
import { Num } from "@/components/ui/Num";

/**
 * Renders a price, or a visible placeholder when the course is not yet priced.
 *
 * Centralised so an unpriced course can never be rendered as "0 SAR" or as
 * free by a component that forgot to handle null. The placeholder reads as
 * obviously unfinished, which is the point.
 */
export function Price({
  sar,
  className = "",
}: {
  sar: number | null;
  className?: string;
}) {
  if (sar === null) {
    return (
      <span className={className}>
        <span className="ltr-num font-mono" dir="ltr">
          {placeholder.price}
        </span>{" "}
        {units.currency}
      </span>
    );
  }

  if (sar === 0) {
    return <span className={className}>مجاني</span>;
  }

  return (
    <span className={className}>
      <Num>{sar}</Num> {units.currency}
    </span>
  );
}
