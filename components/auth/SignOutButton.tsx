"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });

      if (!response.ok) return;

      router.replace("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return <button disabled={isPending} onClick={signOut} type="button">{isPending ? "جارٍ الخروج…" : "خروج"}</button>;
}
