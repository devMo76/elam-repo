"use client";

import { useEffect, useState } from "react";

import styles from "./CoursePlayer.module.css";

export function LessonPdf({ lessonId }: { lessonId: string }) {
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/lessons/${lessonId}/pdf?metadata`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { data?: { fileName: string } } | null) => {
        if (!controller.signal.aborted) setFileName(payload?.data?.fileName ?? null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [lessonId]);

  if (!fileName) return null;
  return (
    <a className={styles.pdfLink} href={`/api/lessons/${lessonId}/pdf`} rel="noopener noreferrer" target="_blank">
      فتح ملف الدرس: {fileName}
    </a>
  );
}
