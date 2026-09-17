"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-reveal wrapper. The only motion primitive on the page.
 *
 * Motivation, per the spec's requirement that every animation justify itself:
 * this communicates hierarchy by letting a section resolve as it enters rather
 * than arriving fully formed, which at MOTION_INTENSITY 5 is the entire motion
 * budget. There is no scroll hijacking, pinning, parallax, or marquee.
 *
 * Under prefers-reduced-motion the element renders in its final state with no
 * transition. It does not merely animate faster, and it never stays hidden,
 * which is the failure mode that makes reduced-motion pages appear empty.
 *
 * Client leaf component. Section shells stay Server Components.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={
        reduce
          ? { duration: 0 }
          : { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
