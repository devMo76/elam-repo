"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { List } from "@phosphor-icons/react";

import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";

import { InstructorUploadPanel } from "./InstructorUploadManager";
import { StudioDialog } from "./StudioDialog";
import { InstructorLink as Link, useInstructorNavigationBlocker } from "./InstructorNavigationBlocker";
import styles from "./InstructorShell.module.css";

const links = [
  { href: "/studio", label: "نظرة عامة" },
  { href: "/studio/courses", label: "دوراتي" },
  { href: "/studio/profile", label: "ملفي العام" },
] as const;

function isActive(pathname: string, href: (typeof links)[number]["href"]) {
  return href === "/studio"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function InstructorShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: { fullName: string };
}) {
  const pathname = usePathname();
  const { confirmNavigation } = useInstructorNavigationBlocker();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const navigation = (mobile = false) => <>
    <div className={styles.identity}>
      <Link aria-label="استوديو الشارح" className={styles.brand} href="/studio" onNavigate={() => setMenuOpen(false)}>
        <Logo className={styles.logo} />
      </Link>
      <strong>استوديو الشارح</strong><span>{viewer.fullName}</span>
    </div>
    <nav className={styles.navigation} aria-label="تنقل الاستوديو">
      {links.map((link) => <Link aria-current={isActive(pathname, link.href) ? "page" : undefined} className={isActive(pathname, link.href) ? styles.activeLink : undefined} href={link.href} key={link.href} onNavigate={() => setMenuOpen(false)}>{link.label}</Link>)}
    </nav>
    <div className={styles.sidebarActions}>
      <Link className={styles.backLink} href="/courses" onNavigate={() => setMenuOpen(false)}>العودة إلى الموقع</Link>
      <SignOutButton beforeSignOut={confirmNavigation} className={styles.signOutButton} />
    </div>
    {mobile && <span className={styles.drawerEnd} />}
  </>;

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <div className={styles.mobileHeader}>
        <button type="button" className={styles.menuButton} aria-label="فتح قائمة الاستوديو" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><List aria-hidden="true" size={24} /></button>
        <strong>استوديو الشارح</strong>
        <Logo className={styles.mobileLogo} />
      </div>
      <StudioDialog drawer open={menuOpen} title="استوديو الشارح" onClose={() => setMenuOpen(false)}>
        <div className={styles.drawerNavigation}>{navigation(true)}</div>
      </StudioDialog>
      <aside className={styles.sidebar} aria-label="تنقل استوديو الشارح">
        <div className={styles.identity}>
          <Link aria-label="استوديو الشارح" className={styles.brand} href="/studio">
            <Logo className={styles.logo} />
          </Link>
          {/* <p>إلام</p> */}
          <strong>استوديو الشارح</strong>
          <span>{viewer.fullName}</span>
        </div>
        <nav className={styles.navigation}>
          {links.map((link) => {
            const active = isActive(pathname, link.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? styles.activeLink : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.sidebarActions}>
          <Link className={styles.backLink} href="/courses">العودة إلى الموقع</Link>
          <SignOutButton beforeSignOut={confirmNavigation} className={styles.signOutButton} />
        </div>
      </aside>
      <div className={styles.workspace}>{children}</div>
      <InstructorUploadPanel />
    </main>
  );
}
