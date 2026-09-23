"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({
  className,
  beforeSignOut,
}: {
  className?: string;
  beforeSignOut?: () => boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    if (beforeSignOut && !beforeSignOut()) return;

    setFailed(false);
    setIsPending(true);

    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });

      if (!response.ok) {
        setFailed(true);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button className={className} disabled={isPending} onClick={signOut} type="button">
      {isPending ? "جارٍ تسجيل الخروج…" : failed ? "تعذّر الخروج — حاول مجددًا" : "تسجيل الخروج"}
    </button>
  );
}
