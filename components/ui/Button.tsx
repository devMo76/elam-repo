import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost";

/**
 * The page has exactly two CTA intents (browse courses, become an instructor),
 * so this stays deliberately small. Both variants meet WCAG AA in both colour
 * modes: primary is --on-accent on --accent (9.4:1 light, 5.9:1 dark), ghost
 * is --ink on --surface with a visible hairline border.
 *
 * whitespace-nowrap is load-bearing: a CTA label wrapping to two lines at
 * desktop is a layout defect, and Arabic labels are easy to under-measure.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-card px-6 py-3 " +
  "text-base font-medium whitespace-nowrap transition-all duration-200 " +
  "ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  ghost: "border border-hairline bg-raised text-ink hover:border-accent",
};

export function Button({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${base} ${variants[variant]}`}>
      {children}
    </Link>
  );
}
