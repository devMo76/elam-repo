"use client";

import { useId } from "react";
import Link from "next/link";
import { policyTitle } from "@/lib/policies";
import styles from "./PolicyAgreement.module.css";

export function PolicyAgreement({ checked, onChange, disabled = false }: {
  checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  const id = useId();
  return <div className={styles.agreement}>
    <input id={id} type="checkbox" name="policyAccepted" required checked={checked}
      disabled={disabled} onChange={event => onChange(event.target.checked)} />
    <label className={styles.label} htmlFor={id}>
      أوافق على <Link href="/policies" target="_blank" rel="noopener noreferrer">{policyTitle}</Link>
    </label>
  </div>;
}
