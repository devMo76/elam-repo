"use client";

import { useEffect, useState } from "react";
import type { AdminCourseReview } from "@/lib/admin/course-review";
import { formatArabicLessonCount } from "@/lib/catalogue/presentation";
import { InstructorVideoPreview } from "@/components/instructor/InstructorVideoPreview";
import styles from "./AdminCourseReviewContent.module.css";

const statusLabel = {
  ready: "جاهز للمشاهدة", processing: "قيد التجهيز", uploading: "جارٍ الرفع",
  failed: "تعذّرت معالجة الفيديو", absent: "بلا فيديو",
};

export function AdminCourseReviewContent({ course }: Pick<AdminCourseReview, "course">) {
  const lessons = course.modules.flatMap(module => module.lessons);
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? null);
  const selected = lessons.find(lesson => lesson.id === selectedId) ?? lessons[0];
  if (!lessons.length) return <p className={styles.notice}>لا توجد دروس في هذه الدورة بعد.</p>;

  return <div className={styles.layout}>
    <nav aria-label="دروس الدورة للمراجعة" className={styles.curriculum}>
      {course.modules.map(module => <section className={styles.module} key={module.id}>
        <h3>{module.title}</h3>
        <p>{formatArabicLessonCount(module.lessons.length)}{module.isPending ? " · إضافة غير منشورة" : ""}</p>
        <ol>{module.lessons.map(lesson => <li key={lesson.id}>
          <button aria-current={selected?.id === lesson.id ? "true" : undefined}
            className={styles.lesson} onClick={() => setSelectedId(lesson.id)} type="button">
            <span>{lesson.title}</span>
            <small>{statusLabel[lesson.mediaStatus]}{lesson.isPending ? " · غير منشور" : ""}{lesson.isFreePreview ? " · معاينة مجانية" : ""}</small>
          </button>
        </li>)}</ol>
      </section>)}
    </nav>
    {selected ? <section aria-label={`مراجعة الدرس: ${selected.title}`} className={styles.viewer}>
      <h2>{selected.title}</h2>
      <InstructorVideoPreview active lessonId={selected.id} lessonTitle={selected.title} mediaStatus={selected.mediaStatus} />
      {selected.mediaStatus !== "ready" ? <p className={styles.notice} role="status">{statusLabel[selected.mediaStatus]}. يمكنك مراجعة بقية الدروس والملفات المرفقة.</p> : null}
      <ReviewPdf key={selected.id} lessonId={selected.id} />
    </section> : null}
  </div>;
}

function ReviewPdf({ lessonId }: { lessonId: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; fileName?: string; absent?: boolean; error?: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/pdf?metadata`, { signal: controller.signal, cache: "no-store" });
        if (controller.signal.aborted) return;
        if (response.status === 404) { setResult({ attempt, absent: true }); return; }
        const payload = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || typeof payload?.data?.fileName !== "string") throw new Error("PDF unavailable");
        setResult({ attempt, fileName: payload.data.fileName });
      } catch {
        if (!controller.signal.aborted) setResult({ attempt, error: true });
      }
    }
    void load();
    return () => controller.abort();
  }, [lessonId, attempt]);
  const current = result?.attempt === attempt ? result : null;
  return <section aria-label="ملف الدرس" className={styles.attachment}>
    {!current ? <p role="status">جارٍ التحقق من ملف الدرس…</p>
      : current.fileName ? <a href={`/api/lessons/${lessonId}/pdf`} target="_blank" rel="noopener noreferrer">فتح ملف الدرس: <bdi>{current.fileName}</bdi></a>
      : current.absent ? <p>لا يوجد ملف PDF لهذا الدرس.</p>
      : <><p role="alert">تعذّر تحميل ملف الدرس.</p><button onClick={() => setAttempt(value => value + 1)} type="button">إعادة تحميل الملف</button></>}
  </section>;
}
