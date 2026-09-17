"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

/** Native disclosure enhanced with interruptible height animation. Keeping the
 * details element preserves Enter/Space operation and the no-JavaScript path.
 * Height is animated here deliberately: the requested expanding answer must
 * move the questions below it, rather than overlap or scale the Arabic text.
 */
export function AnimatedDisclosure({
  title,
  icon,
  children,
  className,
  summaryClassName,
  contentClassName,
}: {
  title: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  className: string;
  summaryClassName?: string;
  contentClassName?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentAnimationRef = useRef<Animation | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const targetOpen = useRef(false);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => animationRef.current?.finish();
    const onMotionChange = () => {
      if (media.matches) finish();
    };
    // Resizing during a transition settles it so Arabic text can reflow naturally.
    let width = details.getBoundingClientRect().width;
    const resize = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - width) > 1) {
        width = entry.contentRect.width;
        finish();
      }
    });
    resize.observe(details);
    media.addEventListener("change", onMotionChange);
    return () => {
      resize.disconnect();
      media.removeEventListener("change", onMotionChange);
      animationRef.current?.cancel();
      contentAnimationRef.current?.cancel();
    };
  }, []);

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = detailsRef.current;
    if (!details) return;
    event.preventDefault();

    // Sample before cancelling so rapid clicks reverse from the current height.
    const from = details.getBoundingClientRect().height;
    const content = contentRef.current;
    const fromOpacity =
      contentAnimationRef.current && content
        ? getComputedStyle(content).opacity
        : details.open
          ? "1"
          : "0";
    const nextOpen = animationRef.current ? !targetOpen.current : !details.open;
    targetOpen.current = nextOpen;
    animationRef.current?.cancel();
    contentAnimationRef.current?.cancel();
    contentAnimationRef.current = null;
    animationRef.current = null;
    details.style.height = "";
    details.style.overflow = "";
    details.dataset.expanded = String(nextOpen);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      details.open = nextOpen;
      return;
    }

    details.open = nextOpen;
    const to = details.getBoundingClientRect().height;
    // Keep the answer rendered until the close transition finishes.
    details.open = true;
    details.style.height = `${from}px`;
    details.style.overflow = "clip";
    if (content) {
      contentAnimationRef.current = content.animate(
        { opacity: [fromOpacity, nextOpen ? "1" : "0"] },
        {
          duration: nextOpen ? 240 : 180,
          easing: "ease-out",
          fill: "forwards",
        },
      );
    }
    const animation = details.animate(
      { height: [`${from}px`, `${to}px`] },
      { duration: 300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      if (animationRef.current !== animation) return;
      details.open = nextOpen;
      details.style.height = "";
      details.style.overflow = "";
      animationRef.current = null;
      contentAnimationRef.current?.cancel();
      contentAnimationRef.current = null;
    };
  }

  return (
    <details ref={detailsRef} className={className}>
      <summary className={summaryClassName} onClick={toggle}>
        {title}
        {icon}
      </summary>
      <div ref={contentRef} className={contentClassName}>
        {children}
      </div>
    </details>
  );
}
