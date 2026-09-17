import type { ReactNode } from "react";

/**
 * Wraps a Latin or numeric run embedded in Arabic text.
 *
 * Without isolation, the bidi algorithm reorders sequences like "EE 301" or
 * "79 SAR" when they sit inside an RTL paragraph, producing "301 EE". Both the
 * dir attribute and unicode-bidi: isolate are applied: dir alone is sufficient
 * in modern browsers, the CSS makes the intent explicit and survives a stray
 * dir inherit.
 *
 * Use this for every course code, duration, price, and count on the page.
 */
export function Num({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={`ltr-num font-mono tabular-nums ${className}`}>
      {children}
    </span>
  );
}
