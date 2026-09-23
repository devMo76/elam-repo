"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/auth/SignOutButton";

import styles from "./AdminShell.module.css";

const links = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/statistics", label: "الإحصاءات" },
  { href: "/admin/orders", label: "الطلبات والإيرادات" },
  { href: "/admin/courses", label: "مراجعة المواد" },
  { href: "/admin/users", label: "المستخدمون" },
  { href: "/admin/settings", label: "الإعدادات والسجل" },
] as const;

type AdminViewer = {
  fullName: string;
};

export function AdminShell({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: AdminViewer;
}) {
  const pathname = usePathname();

  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <aside className={styles.sidebar} aria-label="تنقل الإدارة">
        <div className={styles.identity}>
          <Link aria-label="لوحة إدارة إلام" className={styles.brand} href="/admin">
            <Logo className={styles.logo} />
          </Link>
          <p>إلام</p>
          <strong>إدارة المنصة</strong>
          <span>{viewer.fullName}</span>
        </div>
        <nav className={styles.navigation}>
          {links.map((link) => (
            <Link
              aria-current={pathname === link.href ? "page" : undefined}
              className={pathname === link.href ? styles.activeLink : undefined}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarActions}>
          <Link className={styles.backLink} href="/courses">العودة إلى الموقع</Link>
          <SignOutButton className={styles.signOutButton} />
        </div>
      </aside>
      <div className={styles.workspace}>{children}</div>
    </main>
  );
}
