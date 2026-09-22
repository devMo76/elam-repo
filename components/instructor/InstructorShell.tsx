"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";

import { InstructorUploadPanel } from "./InstructorUploadManager";
import { InstructorLink as Link, useInstructorNavigationBlocker } from "./InstructorNavigationBlocker";
import styles from "./InstructorShell.module.css";

const links = [
  { href: "/studio", label: "نظرة عامة" },
  { href: "/studio/courses", label: "مقرراتي" },
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

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <aside className={styles.sidebar} aria-label="تنقل استوديو المدرّس">
        <div className={styles.identity}>
          <Link aria-label="استوديو إلام" className={styles.brand} href="/studio">
            <Logo className={styles.logo} />
          </Link>
          {/* <p>إلام</p> */}
          <strong>استوديو المدرّس</strong>
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
