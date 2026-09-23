"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const sentinel = document.getElementById("header-sentinel");
    if (!header || !sentinel) return;
    let frame = 0;
    // Observe the viewport edge directly so resizing needs no observer reset.
    const observer = new IntersectionObserver(
      ([entry]) => {
        header.dataset.scrolled = String(entry.boundingClientRect.top < 0);
        frame = requestAnimationFrame(() => {
          header.dataset.ready = "true";
        });
      },
      { threshold: [0, 1] },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-page={
        pathname === "/" || pathname === "/animation"
          ? "home"
          : pathname === "/alternate" || pathname === "/alternate-2"
            ? "alternate"
            : "inner"
      }
    >
      <div className={styles.surface}>{children}</div>
    </header>
  );
}

export function HeaderNavigation({
  links,
  browse,
  desktopAccount,
  mobileAccount,
}: {
  links: { href: string; label: string }[];
  browse: string;
  desktopAccount?: ReactNode;
  mobileAccount?: ReactNode;
}) {
  const pathname = usePathname();
  const base = ["/", "/alternate", "/alternate-2", "/animation"].includes(
    pathname,
  )
    ? ""
    : "/";
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = detailsRef.current;
    const summary = details?.querySelector("summary");
    const panel = details?.querySelector<HTMLElement>("[data-menu-panel]");
    if (!details || !summary || !panel) return;
    let animation: Animation | null = null;
    let expanded = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    function settle() {
      animation?.cancel();
      animation = null;
      details!.open = expanded;
    }
    function setOpen(next: boolean, restoreFocus = false) {
      const opacity = details!.open ? getComputedStyle(panel!).opacity : "0";
      const transform = details!.open
        ? getComputedStyle(panel!).transform
        : "translateY(-8px)";
      animation?.cancel();
      expanded = next;
      summary!.setAttribute("aria-expanded", String(next));
      details!.dataset.expanded = String(next);
      panel!.inert = !next;
      if (restoreFocus) summary!.focus();
      if (reduced.matches || desktop.matches) {
        settle();
        return;
      }
      details!.open = true;
      animation = panel!.animate(
        [
          { opacity, transform },
          {
            opacity: next ? "1" : "0",
            transform: next ? "translateY(0)" : "translateY(-8px)",
          },
        ],
        {
          duration: next ? 220 : 160,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        },
      );
      animation.onfinish = settle;
    }
    // Also reset an open menu when navigating between routes.
    settle();
    summary.setAttribute("aria-expanded", "false");
    details.dataset.expanded = "false";
    panel.inert = true;
    const toggle = (event: MouseEvent) => {
      event.preventDefault();
      setOpen(!expanded);
    };
    const outside = (event: PointerEvent) => {
      if (
        expanded &&
        event.target instanceof Node &&
        !details.contains(event.target)
      )
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (expanded && event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
      }
    };
    const navigate = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a"))
        setOpen(false, true);
    };
    const focus = (event: FocusEvent) => {
      if (
        expanded &&
        event.target instanceof Node &&
        !details.contains(event.target)
      )
        setOpen(false);
    };
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    const motion = () => {
      if (reduced.matches) settle();
    };
    summary.addEventListener("click", toggle);
    panel.addEventListener("click", navigate);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    desktop.addEventListener("change", resize);
    reduced.addEventListener("change", motion);
    return () => {
      animation?.cancel();
      summary.removeEventListener("click", toggle);
      panel.removeEventListener("click", navigate);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      document.removeEventListener("focusin", focus);
      desktop.removeEventListener("change", resize);
      reduced.removeEventListener("change", motion);
    };
  }, [pathname]);
  const items = links.map((link) => (
    <Link
      key={link.href}
      href={link.href.startsWith("#") ? `${base}${link.href}` : link.href}
      className={styles.link}
    >
      {link.label}
    </Link>
  ));
  return (
    <>
      <nav aria-label="التنقل الرئيسي" className={styles.desktop}>
        {items}
      </nav>
      <Link href={`${base}#catalog`} className={styles.browse}>
        {browse}
      </Link>
      {desktopAccount ? (
        <div className={styles.accountDesktop}>{desktopAccount}</div>
      ) : null}
      <details ref={detailsRef} className={styles.menu}>
        <summary
          aria-label="القائمة الرئيسية"
          aria-controls="header-menu"
          className={styles.toggle}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </summary>
        <div id="header-menu" data-menu-panel className={styles.panel}>
          <p className={styles.menuLabel}>ابدأ من هنا</p>
          <nav aria-label="التنقل الرئيسي للجوال">{items}</nav>
          {mobileAccount ? (
            <div className={styles.accountMobile}>{mobileAccount}</div>
          ) : null}
          <Link href={`${base}#catalog`} className={styles.menuBrowse}>
            {browse}
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </details>
    </>
  );
}
