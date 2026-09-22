"use client";

import { useEffect, useRef } from "react";

import type { StudioLesson } from "./studio-types";
import { useInstructorUploads } from "./InstructorUploadManager";
import styles from "./InstructorWorkspace.module.css";

type UploadState = StudioLesson["mediaStatus"];

function statusLabel(status: UploadState) {
  return {
    absent: "لم يُرفع فيديو بعد",
    uploading: "جارٍ رفع الفيديو",
    processing: "جارٍ تجهيز الفيديو",
    ready: "الفيديو جاهز",
    failed: "تعذّرت معالجة الفيديو",
  }[status];
}

export function PersistentInstructorVideoUpload({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  initialStatus,
  onStatusChange,
}: {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  initialStatus: UploadState;
  onStatusChange: (status: UploadState) => void;
}) {
  const { cancelUpload, startUpload, trackLesson, uploads } = useInstructorUploads();
  const upload = uploads[lessonId];
  const status = upload?.mediaStatus ?? initialStatus;
  const progress = upload?.isClientUpload
    ? upload.uploadProgress
    : status === "processing"
      ? upload?.processingProgress ?? null
      : null;
  const isBusy = Boolean(
    upload?.isPreparing ||
    upload?.isClientUpload ||
    status === "uploading" ||
    status === "processing",
  );
  const hasMeasurableProgress = progress !== null && progress > 0;
  const reportedStatus = useRef(status);

  useEffect(() => {
    trackLesson({ courseId, courseTitle, lessonId, lessonTitle, mediaStatus: initialStatus });
  }, [courseId, courseTitle, initialStatus, lessonId, lessonTitle, trackLesson]);

  useEffect(() => {
    if (status === reportedStatus.current) return;
    reportedStatus.current = status;
    onStatusChange(status);
  }, [onStatusChange, status]);

  return (
    <div className={styles.uploadControl}>
      <span className={styles.status}>
        {upload?.isPreparing ? "يجري تجهيز الرفع" : upload?.isClientUpload ? "جارٍ رفع الفيديو" : statusLabel(status)}
      </span>
      {upload?.requiresFile ? (
        <div className={styles.uploadRecovery}>
          <span>لا يمكن استئناف الملف بعد إعادة تحميل الصفحة. ألغِ الرفع السابق، ثم اختر الملف نفسه أو ملفًا بديلًا.</span>
          <button className={styles.dangerTextButton} onClick={() => void cancelUpload(lessonId)} type="button">إلغاء الرفع السابق</button>
        </div>
      ) : isBusy ? (
        <div className={styles.uploadProgress} aria-live="polite">
          {hasMeasurableProgress ? (
            <>
              <div
                aria-label={`${statusLabel(status)}: ${progress}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progress}
                className={styles.uploadMeter}
                role="progressbar"
              >
                <span style={{ inlineSize: `${progress}%` }} />
              </div>
              <bdi className={styles.uploadPercent} dir="ltr">{progress}%</bdi>
            </>
          ) : <span className={styles.uploadWaiting}>{upload?.isPreparing ? "يجري الاتصال بخدمة الفيديو…" : "يُحدّث تلقائيًا…"}</span>}
        </div>
      ) : (
        <label className={styles.uploadButton}>
          <input
            accept="video/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) {
                void startUpload({
                  courseId,
                  courseTitle,
                  lessonId,
                  lessonTitle,
                  fallbackStatus: initialStatus,
                  file,
                });
              }
            }}
            type="file"
          />
          {status === "failed" ? "رفع فيديو بديل" : status === "ready" ? "استبدال الفيديو" : "رفع فيديو"}
        </label>
      )}
      {upload?.error ? <p className={styles.error} role="alert">{upload.error}</p> : null}
    </div>
  );
}
