"use client";

import { useEffect, useState } from "react";
import { apiErrorResponseSchema } from "@/lib/contracts/api-error";
import { lessonPlaybackResponseSchema, type LessonPlaybackResponse } from "@/lib/contracts/video";
import type { StudioLesson } from "./studio-types";
import styles from "./InstructorVideoPreview.module.css";

type PreviewResult = {
  lessonId: string;
  attempt: number;
  playback: LessonPlaybackResponse["data"] | null;
  error: string | null;
};

function previewError(code?: string) {
  if (code === "playback_forbidden" || code === "unauthenticated") {
    return "تعذّر الوصول إلى المعاينة. تحقّق من تسجيل الدخول وصلاحية الوصول إلى الدورة.";
  }
  if (code === "video_not_ready") return "الفيديو قيد التجهيز. أعد المحاولة بعد قليل.";
  return "تعذّر تحميل المعاينة. تحقّق من الاتصال ثم أعد المحاولة.";
}

// Remount when shown again: obtain a fresh signed URL and stop playback on close.
export function InstructorVideoPreview({ lessonId, lessonTitle, mediaStatus, active }: {
  lessonId: string;
  lessonTitle: string;
  mediaStatus: StudioLesson["mediaStatus"];
  active: boolean;
}) {
  return active && mediaStatus === "ready"
    ? <ReadyVideoPreview key={lessonId} lessonId={lessonId} lessonTitle={lessonTitle} />
    : null;
}

function ReadyVideoPreview({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const current = result?.lessonId === lessonId && result.attempt === attempt ? result : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/lessons/${lessonId}/playback`, {
          signal: controller.signal, cache: "no-store",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok) {
          const parsed = apiErrorResponseSchema.safeParse(payload);
          setResult({ lessonId, attempt, playback: null, error: previewError(parsed.success ? parsed.data.error.code : undefined) });
          return;
        }
        const parsed = lessonPlaybackResponseSchema.safeParse(payload);
        if (!parsed.success || Date.parse(parsed.data.data.expiresAt) <= Date.now()) {
          setResult({ lessonId, attempt, playback: null, error: previewError() });
          return;
        }
        setResult({ lessonId, attempt, playback: parsed.data.data, error: null });
      } catch {
        if (!controller.signal.aborted) setResult({ lessonId, attempt, playback: null, error: previewError() });
      }
    }
    void load();
    return () => controller.abort();
  }, [lessonId, attempt]);

  return <section aria-label={`معاينة الفيديو: ${lessonTitle}`} className={styles.preview}>
    <header className={styles.header}>
      <h3>معاينة الفيديو</h3>
      {current?.playback ? <span>جاهز للمشاهدة</span> : null}
    </header>
    {!current ? <div aria-label="جارٍ تحميل معاينة الفيديو" className={styles.loading} role="status"><span>جارٍ تحميل المعاينة…</span></div>
      : current.playback ? <iframe
          key={attempt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.frame}
          onError={() => setResult({ lessonId, attempt, playback: null, error: previewError() })}
          referrerPolicy="strict-origin-when-cross-origin"
          src={current.playback.playbackUrl}
          title={`معاينة الدرس: ${lessonTitle}`}
        />
      : <p className={styles.error} role="alert">{current.error}</p>}
    <button className={styles.refresh} disabled={!current} onClick={() => setAttempt(value => value + 1)} type="button">
      {current?.playback ? "تحديث المعاينة" : "إعادة المحاولة"}
    </button>
  </section>;
}
