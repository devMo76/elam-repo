import { Num } from "./Num";

/** Course codes use mono; Arabic department/title fallbacks use the site font. */
export function CourseLabel({ children, className = "" }: { children: string; className?: string }) {
  if (/\p{Script=Arabic}/u.test(children)) {
    return <span dir="auto" className={`font-sans ${className}`}>{children}</span>;
  }

  return <Num className={className}>{children}</Num>;
}
