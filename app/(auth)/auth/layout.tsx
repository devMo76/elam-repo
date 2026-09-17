import type { ReactNode } from "react";

import { PublicShell } from "@/components/marketing/PublicShell";

import styles from "./page.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PublicShell><main className={styles.main}>{children}</main></PublicShell>;
}
