import Link from "next/link";

import { PublicShell } from "@/components/marketing/PublicShell";

export default function CourseNotFound() {
  return (
    <PublicShell>
      <main className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-elam-secondary">404</p>
          <h1 className="mt-3 text-3xl font-semibold text-elam-primary">
            هذه المادة غير متوفرة
          </h1>
          <p className="mt-3 text-slate-600">قد تكون لم تُنشر بعد أو تغير رابطها.</p>
          <Link
            className="mt-6 inline-flex rounded-lg bg-elam-primary px-5 py-3 font-semibold text-white"
            href="/courses"
          >
            تصفح المواد
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
