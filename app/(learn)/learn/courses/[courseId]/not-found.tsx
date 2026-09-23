import Link from "next/link";

import { PublicShell } from "@/components/marketing/PublicShell";

export default function LearningCourseNotFound() {
  return (
    <PublicShell>
      <div className="mx-auto min-h-[60dvh] w-[min(100%-1.5rem,78rem)] py-16">
        <h1 className="text-3xl font-bold text-ink">المادة غير متاحة</h1>
        <p className="mt-3 max-w-xl text-muted">
          قد تكون المادة غير منشورة أو غير متاحة لحسابك.
        </p>
        <Link className="mt-6 inline-flex min-h-11 items-center rounded-card bg-accent px-4 font-semibold text-on-accent" href="/dashboard">
          العودة إلى لوحة التعلّم
        </Link>
      </div>
    </PublicShell>
  );
}
