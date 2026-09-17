"use client";

import { Upload } from "tus-js-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  DirectVideoUploadResponse,
  LessonVideoStatusResponse,
} from "@/lib/contracts";

import type { AuthoringApiError, StudioLesson } from "./studio-types";
import styles from "./InstructorUploadManager.module.css";

type UploadState = StudioLesson["mediaStatus"];

type ManagedUpload = {
  lessonId: string;
  lessonTitle: string;
  mediaStatus: UploadState;
  uploadProgress: number | null;
  processingProgress: number | null;
  isClientUpload: boolean;
  isPreparing: boolean;
  error: string | null;
};

type StoredUpload = Pick<
  ManagedUpload,
  | "lessonId"
  | "lessonTitle"
  | "mediaStatus"
  | "uploadProgress"
  | "processingProgress"
  | "error"
>;

type UploadManager = {
  uploads: Record<string, ManagedUpload>;
  trackLesson: (input: {
    lessonId: string;
    lessonTitle: string;
    mediaStatus: UploadState;
  }) => void;
  startUpload: (input: {
    lessonId: string;
    lessonTitle: string;
    fallbackStatus: UploadState;
    file: File;
  }) => Promise<void>;
};

const STORAGE_KEY = "elam.instructor-video-uploads.v1";
const UploadManagerContext = createContext<UploadManager | null>(null);

function isActive(upload: ManagedUpload) {
  return (
    upload.isPreparing ||
    upload.isClientUpload ||
    upload.mediaStatus === "uploading" ||
    upload.mediaStatus === "processing"
  );
}

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

function statusLabel(upload: ManagedUpload) {
  if (upload.isPreparing) return "يجري تجهيز الرفع";
  if (upload.isClientUpload) return "جارٍ رفع الفيديو";

  return {
    absent: "لم يُرفع فيديو بعد",
    uploading: "جارٍ رفع الفيديو",
    processing: "جارٍ تجهيز الفيديو",
    ready: "الفيديو جاهز",
    failed: "تعذّرت معالجة الفيديو",
  }[upload.mediaStatus];
}

function progressFor(upload: ManagedUpload) {
  if (upload.isClientUpload) return upload.uploadProgress;
  if (upload.mediaStatus === "processing") return upload.processingProgress;
  return null;
}

function restoreUploads() {
  if (typeof window === "undefined") return {} as Record<string, ManagedUpload>;

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredUpload[];
    return Object.fromEntries(
      stored
        .filter((upload) => upload.lessonId && (upload.mediaStatus === "uploading" || upload.mediaStatus === "processing"))
        .map((upload) => [
          upload.lessonId,
          {
            ...upload,
            isClientUpload: false,
            isPreparing: false,
          },
        ]),
    );
  } catch {
    return {} as Record<string, ManagedUpload>;
  }
}

export function InstructorUploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<Record<string, ManagedUpload>>({});
  const uploadsRef = useRef(uploads);
  const uploadsByLessonRef = useRef(new Map<string, Upload>());
  const restoredRef = useRef(false);

  useEffect(() => {
    uploadsRef.current = uploads;

    if (!restoredRef.current) return;

    const stored = Object.values(uploads)
      .filter(isActive)
      .map<StoredUpload>((upload) => ({
        lessonId: upload.lessonId,
        lessonTitle: upload.lessonTitle,
        mediaStatus: upload.mediaStatus,
        uploadProgress: upload.uploadProgress,
        processingProgress: upload.processingProgress,
        error: upload.error,
      }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [uploads]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restored = restoreUploads();
      restoredRef.current = true;
      setUploads((current) => ({ ...restored, ...current }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateUpload = useCallback((lessonId: string, updater: (upload: ManagedUpload) => ManagedUpload) => {
    setUploads((current) => {
      const upload = current[lessonId];
      if (!upload) return current;
      return { ...current, [lessonId]: updater(upload) };
    });
  }, []);

  const trackLesson = useCallback((input: {
    lessonId: string;
    lessonTitle: string;
    mediaStatus: UploadState;
  }) => {
    if (input.mediaStatus !== "uploading" && input.mediaStatus !== "processing") return;

    setUploads((current) => {
      const existing = current[input.lessonId];
      if (existing) {
        return {
          ...current,
          [input.lessonId]: { ...existing, lessonTitle: input.lessonTitle },
        };
      }

      return {
        ...current,
        [input.lessonId]: {
          ...input,
          uploadProgress: null,
          processingProgress: null,
          isClientUpload: false,
          isPreparing: false,
          error: null,
        },
      };
    });
  }, []);

  const refreshStatuses = useCallback(async () => {
    const pending = Object.values(uploadsRef.current).filter(
      (upload) => isActive(upload) && !upload.isClientUpload && !upload.isPreparing,
    );

    await Promise.all(
      pending.map(async (upload) => {
        try {
          const response = await fetch(`/api/instructor/lessons/${upload.lessonId}/video-status`, {
            cache: "no-store",
          });
          const payload = (await response.json().catch(() => null)) as {
            data?: LessonVideoStatusResponse["data"];
          } & AuthoringApiError;

          if (!response.ok || !payload.data) {
            if (response.status >= 500) {
              updateUpload(upload.lessonId, (current) => ({
                ...current,
                error: "تعذّر تحديث حالة الفيديو. سيُعاد التحقق تلقائيًا.",
              }));
            }
            return;
          }

          updateUpload(upload.lessonId, (current) => {
            if (current.isClientUpload || current.isPreparing) return current;

            return {
              ...current,
              mediaStatus: payload.data!.mediaStatus,
              processingProgress:
                payload.data!.mediaStatus === "processing"
                  ? payload.data!.encodingProgress
                  : current.processingProgress,
              error: null,
            };
          });
        } catch {
          updateUpload(upload.lessonId, (current) => ({
            ...current,
            error: "تعذّر تحديث حالة الفيديو. سيُعاد التحقق تلقائيًا.",
          }));
        }
      }),
    );
  }, [updateUpload]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshStatuses(), 5_000);
    const refreshOnFocus = () => void refreshStatuses();

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [refreshStatuses]);

  const startUpload = useCallback(async ({ lessonId, lessonTitle, fallbackStatus, file }: {
    lessonId: string;
    lessonTitle: string;
    fallbackStatus: UploadState;
    file: File;
  }) => {
    const current = uploadsRef.current[lessonId];
    if (current?.isClientUpload || current?.isPreparing) return;

    setUploads((uploads) => ({
      ...uploads,
      [lessonId]: {
        lessonId,
        lessonTitle,
        mediaStatus: "uploading",
        uploadProgress: 0,
        processingProgress: null,
        isClientUpload: true,
        isPreparing: true,
        error: null,
      },
    }));

    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}/upload`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        data?: DirectVideoUploadResponse["data"];
      } & AuthoringApiError;

      if (!response.ok || !payload.data) {
        updateUpload(lessonId, (upload) => ({
          ...upload,
          mediaStatus: fallbackStatus,
          uploadProgress: null,
          isClientUpload: false,
          isPreparing: false,
          error: uploadError(payload),
        }));
        return;
      }

      updateUpload(lessonId, (upload) => ({ ...upload, isPreparing: false }));
      const upload = new Upload(file, {
        endpoint: payload.data.upload.endpoint,
        headers: payload.data.upload.headers,
        metadata: { filetype: file.type || "video/mp4", title: file.name },
        removeFingerprintOnSuccess: true,
        retryDelays: [0, 1_000, 3_000, 5_000],
        onError: () => {
          uploadsByLessonRef.current.delete(lessonId);
          updateUpload(lessonId, (currentUpload) => ({
            ...currentUpload,
            isClientUpload: false,
            uploadProgress: null,
            error: "تعذّر رفع الفيديو بعد إعادة المحاولة. تحقّق من اتصالك أو اختر الملف مرة أخرى.",
          }));
        },
        onProgress: (uploaded, total) => {
          if (total > 0) {
            updateUpload(lessonId, (currentUpload) => ({
              ...currentUpload,
              uploadProgress: Math.round((uploaded / total) * 100),
            }));
          }
        },
        onSuccess: () => {
          uploadsByLessonRef.current.delete(lessonId);
          updateUpload(lessonId, (currentUpload) => ({
            ...currentUpload,
            mediaStatus: "processing",
            isClientUpload: false,
            uploadProgress: null,
          }));
          void refreshStatuses();
        },
      });

      uploadsByLessonRef.current.set(lessonId, upload);
      upload.start();
    } catch {
      updateUpload(lessonId, (upload) => ({
        ...upload,
        mediaStatus: fallbackStatus,
        uploadProgress: null,
        isClientUpload: false,
        isPreparing: false,
        error: "تعذّر الاتصال بالخدمة. تحقّق من الاتصال ثم حاول مرة أخرى.",
      }));
    }
  }, [refreshStatuses, updateUpload]);

  const value = useMemo<UploadManager>(() => ({
    uploads,
    trackLesson,
    startUpload,
  }), [startUpload, trackLesson, uploads]);

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useInstructorUploads() {
  const manager = useContext(UploadManagerContext);
  if (!manager) throw new Error("Instructor uploads must be used within the Studio upload provider.");
  return manager;
}

export function InstructorUploadPanel() {
  const { uploads } = useInstructorUploads();
  const activeUploads = Object.values(uploads).filter(isActive);

  if (activeUploads.length === 0) return null;

  return (
    <aside aria-label="عمليات الفيديو الجارية" className={styles.panel}>
      <div className={styles.panelHeader}>
        <strong>عمليات الفيديو</strong>
        <span><bdi dir="ltr">{activeUploads.length}</bdi> جارية</span>
      </div>
      <ul className={styles.uploadList}>
        {activeUploads.map((upload) => {
          const progress = progressFor(upload);
          const hasProgress = progress !== null && progress > 0;

          return (
            <li key={upload.lessonId}>
              <div className={styles.uploadHeading}>
                <strong>{upload.lessonTitle}</strong>
                <span>{statusLabel(upload)}</span>
              </div>
              {hasProgress ? (
                <div className={styles.progressRow}>
                  <div
                    aria-label={`${statusLabel(upload)}: ${progress}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={progress}
                    className={styles.meter}
                    role="progressbar"
                  >
                    <span style={{ inlineSize: `${progress}%` }} />
                  </div>
                  <bdi dir="ltr">{progress}%</bdi>
                </div>
              ) : <p>{upload.isPreparing ? "يجري الاتصال بخدمة الفيديو…" : "يُحدّث تلقائيًا…"}</p>}
              {upload.error ? <p className={styles.error} role="alert">{upload.error}</p> : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
