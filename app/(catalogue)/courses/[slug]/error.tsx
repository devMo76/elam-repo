"use client";

export default function CourseError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center" dir="rtl">
      <div>
        <h1 className="text-2xl font-semibold text-elam-primary">تعذر تحميل المادة</h1>
        <p className="mt-3 text-slate-600">جرّب مرة ثانية بعد قليل.</p>
        <button
          className="mt-6 rounded-lg bg-elam-primary px-5 py-3 font-semibold text-white"
          onClick={reset}
          type="button"
        >
          إعادة المحاولة
        </button>
      </div>
    </main>
  );
}
