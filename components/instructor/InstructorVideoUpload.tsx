"use client";

import { Upload } from "tus-js-client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DirectVideoUploadResponse, LessonVideoStatusResponse } from "@/lib/contracts";

import type { AuthoringApiError, StudioLesson } from "./studio-types";
import styles from "./InstructorWorkspace.module.css";

type UploadState = StudioLesson["mediaStatus"];

function uploadError(payload: AuthoringApiError | null) {
  switch (payload?.error?.code) {
    case "video_upload_in_progress":
      return "يوجد رفع أو معالجة جارية لهذا الدرس. انتظر حتى تكتمل الحالة ثم حاول مرة أخرى.";
    case "video_provider_unavailable":
      return "خدمة الفيديو غير متاحة الآن. حاول مرة أخرى بعد قليل.";
    case "forbidden":
      return "لا تملك صلاحية رفع فيديو لهذا الدرس.";
    default:
      return "تعذّر تجهيز رفع الفيديو. تحقّق من الاتصال ثم حاول مرة أخرى.";
  }
}

function statusLabel(status: UploadState) {
  return {
    absent: "لم يُرفع فيديو بعد",
    uploading: "جارٍ رفع الفيديو",
    processing: "جارٍ تجهيز الفيديو",
    ready: "الفيديو جاهز",
    failed: "تعذّرت معالجة الفيديو",
  }[status];
}

export function InstructorVideoUpload({
  lessonId,
  initialStatus,
  onStatusChange,
}: {
  lessonId: string;
  initialStatus: UploadState;
  onStatusChange: (status: UploadState) => void;
}) {
  const [status, setStatus] = useState<UploadState>(initialStatus);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [isClientUpload, setIsClientUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<Upload | null>(null);

  const updateStatus = useCallback((nextStatus: UploadState) => {
    setStatus(nextStatus);
    onStatusChange(nextStatus);
  }, [onStatusChange]);

  useEffect(() => {
    // The browser owns the direct TUS upload. Do not let a premature server
    // status response replace its byte-level upload progress.
    if (isClientUpload || (status !== "uploading" && status !== "processing")) return;

    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/instructor/lessons/${lessonId}/video-status`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { data?: LessonVideoStatusResponse["data"] } & AuthoringApiError;

        if (!response.ok || !payload.data || cancelled) {
          if (!cancelled && response.status >= 500) setError("تعذّر تحديث حالة الفيديو. سيُعاد التحقق تلقائيًا.");
        } else {
          setError(null);
          if (payload.data.mediaStatus === "processing") {
            setProcessingProgress(payload.data.encodingProgress);
          }
          updateStatus(payload.data.mediaStatus);
          if (payload.data.mediaStatus === "ready" || payload.data.mediaStatus === "failed") return;
        }
      } catch {
        if (!cancelled) setError("تعذّر تحديث حالة الفيديو. سيُعاد التحقق تلقائيًا.");
      }

      if (!cancelled) timer = window.setTimeout(poll, 5_000);
    }

    timer = window.setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isClientUpload, lessonId, status, updateStatus]);

  async function startUpload(file: File) {
    setError(null);
    setUploadProgress(0);
    setProcessingProgress(null);

    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}/upload`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { data?: DirectVideoUploadResponse["data"] } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        setUploadProgress(null);
        setError(uploadError(payload));
        return;
      }

      updateStatus("uploading");
      setIsClientUpload(true);
      const upload = new Upload(file, {
        endpoint: payload.data.upload.endpoint,
        headers: payload.data.upload.headers,
        metadata: { filename: file.name, filetype: file.type || "video/mp4" },
        removeFingerprintOnSuccess: true,
        retryDelays: [0, 1_000, 3_000, 5_000],
        onError: () => {
          setIsClientUpload(false);
          setUploadProgress(null);
          setError("تعذّر رفع الفيديو بعد إعادة المحاولة. تحقّق من اتصالك أو اختر الملف مرة أخرى.");
        },
        onProgress: (uploaded, total) => {
          if (total > 0) setUploadProgress(Math.round((uploaded / total) * 100));
        },
        onSuccess: () => {
          uploadRef.current = null;
          setIsClientUpload(false);
          updateStatus("processing");
          setUploadProgress(null);
        },
      });

      uploadRef.current = upload;
      upload.start();
    } catch {
      setIsClientUpload(false);
      setUploadProgress(null);
      setError("تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.");
    }
  }

  const active = isClientUpload || status === "uploading" || status === "processing";
  const activeLabel = isClientUpload ? statusLabel("uploading") : statusLabel(status);
  const visibleProgress = isClientUpload
    ? uploadProgress
    : status === "processing"
      ? processingProgress
      : null;
  const hasMeasurableProgress = visibleProgress !== null && visibleProgress > 0;

  return (
    <div className={styles.uploadControl}>
      <span className={styles.status}>{activeLabel}</span>
      {active ? (
        <div className={styles.uploadProgress}>
          {!hasMeasurableProgress ? <span className={styles.uploadWaiting}>يُحدَّث تلقائيًا…</span> : <>
            <div aria-label={`${statusLabel(status)}: ${visibleProgress}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={visibleProgress} className={styles.uploadMeter} role="progressbar">
              <span style={{ inlineSize: `${visibleProgress}%` }} />
            </div>
            <bdi className={styles.uploadPercent} dir="ltr">{visibleProgress}%</bdi>
          </>}
        </div>
      ) : (
        <label className={styles.uploadButton}>
          <input accept="video/*" onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) void startUpload(file);
          }} type="file" />
          {status === "failed" ? "رفع فيديو بديل" : status === "ready" ? "استبدال الفيديو" : "رفع فيديو"}
        </label>
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
