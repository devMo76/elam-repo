"use client";

export default function LearningError({
  retry,
}: {
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-[min(100%-1.5rem,78rem)] flex-col justify-center py-16">
      <h1 className="text-3xl font-bold text-ink">تعذر تحميل مساحة التعلّم</h1>
      <p className="mt-3 max-w-xl text-muted">
        حدثت مشكلة مؤقتة أثناء جلب بياناتك. حاول مرة أخرى.
      </p>
      <button
        className="mt-6 inline-flex min-h-11 w-fit items-center rounded-card bg-accent px-4 font-semibold text-on-accent"
        onClick={retry}
        type="button"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
