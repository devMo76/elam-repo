"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: SSR/no-JS content is visible. A single observer
 * introduces each section once, without scroll listeners or React frame updates.
 * This is separate from the original page's Reveal to avoid changing that design.
 */
export function PageMotion({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const targets =
      root.current?.querySelectorAll<HTMLElement>("[data-reveal]") ?? [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          observer.unobserve(element);
          element.dataset.visible = "true";
          if (media.matches) continue;
          const animation = element.animate(
            [
              { opacity: 0, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 580,
              delay: Number(element.dataset.revealDelay ?? 0),
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.12 },
    );

    const finishMotion = () => {
      if (!media.matches) return;
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    };
    targets.forEach((element) => observer.observe(element));
    media.addEventListener("change", finishMotion);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", finishMotion);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
