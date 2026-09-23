import { PublicShell } from "@/components/marketing/PublicShell";

export default function CoursePlayerLoading() {
  return (
    <PublicShell>
      <div className="mx-auto min-h-[60dvh] w-[min(100%-1.5rem,78rem)] py-10" aria-busy="true" aria-label="جاري تحميل المادة">
        <div className="h-8 w-40 rounded-card bg-tint" />
        <div className="mt-6 h-12 w-2/3 rounded-card bg-tint" />
        <div className="mt-8 aspect-video rounded-card bg-tint" />
      </div>
    </PublicShell>
  );
}
