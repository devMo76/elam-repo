"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { getThemeSnapshot, getServerThemeSnapshot, setTheme, subscribeTheme } from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const action = theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
  return <button aria-label="الوضع الليلي" aria-pressed={theme === "dark"} className={`${styles.button} ${showLabel ? styles.withLabel : ""}`}
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={action} type="button">
    <Moon aria-hidden size={21} weight="duotone" className={styles.moon} />
    <Sun aria-hidden size={21} weight="duotone" className={styles.sun} />
    {showLabel ? <span>{theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}</span> : null}
  </button>;
}
