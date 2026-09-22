"use client";

import { Upload } from "tus-js-client";
import Link from "next/link";
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
import { createStatusPoller, shouldPollVideoStatus, type StatusPoller } from "@/lib/video/status-poller";

import type { AuthoringApiError, StudioLesson } from "./studio-types";
import styles from "./InstructorUploadManager.module.css";

type UploadState = StudioLesson["mediaStatus"];

type ManagedUpload = {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  mediaStatus: UploadState;
  uploadProgress: number | null;
  processingProgress: number | null;
  isClientUpload: boolean;
  isPreparing: boolean;
  requiresFile: boolean;
  isStalled: boolean;
  isCancelled: boolean;
  lastCheckedAt: string | null;
  lastProgressAt: string;
  error: string | null;
};

type StoredUpload = Pick<
  ManagedUpload,
  | "lessonId"
  | "lessonTitle"
  | "courseId"
  | "courseTitle"
  | "mediaStatus"
  | "uploadProgress"
  | "processingProgress"
  | "isClientUpload"
  | "requiresFile"
  | "isStalled"
  | "isCancelled"
  | "lastCheckedAt"
  | "lastProgressAt"
  | "error"
>;

type UploadManager = {
  uploads: Record<string, ManagedUpload>;
  trackLesson: (input: {
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
    mediaStatus: UploadState;
  }) => void;
  startUpload: (input: {
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
    fallbackStatus: UploadState;
    file: File;
  }) => Promise<void>;
  cancelUpload: (lessonId: string) => Promise<void>;
  dismissUpload: (lessonId: string) => void;
};

const STORAGE_KEY = "elam.instructor-video-uploads.v1";
const STALLED_AFTER_MS = 30 * 60 * 1_000;
const UploadManagerContext = createContext<UploadManager | null>(null);

function isActive(upload: ManagedUpload) {
  return (
    upload.isPreparing ||
    upload.isClientUpload ||
    upload.mediaStatus === "uploading" ||
    upload.mediaStatus === "processing"
  );
}

function shouldPoll(upload: ManagedUpload) {
  return shouldPollVideoStatus(upload);
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
  if (upload.isCancelled) return "أُلغي الفيديو";
  if (upload.requiresFile) return "توقّف رفع الملف";
  if (upload.isStalled) return "تأخر تجهيز الفيديو";
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

function checkedLabel(value: string | null) {
  if (!value) return "لم يُتحقق بعد";
  return `آخر تحقق ${new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(value))}`;
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
            courseId: upload.courseId ?? "",
            courseTitle: upload.courseTitle ?? "المقرر",
            lessonTitle: upload.lessonTitle ?? "درس بدون عنوان",
            isClientUpload: false,
            isPreparing: false,
            requiresFile: upload.isClientUpload || upload.requiresFile,
            isStalled: upload.isStalled ?? false,
            isCancelled: false,
            lastCheckedAt: upload.lastCheckedAt ?? null,
            lastProgressAt: upload.lastProgressAt ?? new Date().toISOString(),
            error: upload.error ?? null,
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
  const pollerRef = useRef<StatusPoller | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    uploadsRef.current = uploads;

    if (!restoredRef.current) return;

    const stored = Object.values(uploads)
      .filter(isActive)
      .map<StoredUpload>((upload) => ({
        lessonId: upload.lessonId,
        lessonTitle: upload.lessonTitle,
        courseId: upload.courseId,
        courseTitle: upload.courseTitle,
        mediaStatus: upload.mediaStatus,
        uploadProgress: upload.uploadProgress,
        processingProgress: upload.processingProgress,
        isClientUpload: upload.isClientUpload,
        requiresFile: upload.requiresFile,
        isStalled: upload.isStalled,
        isCancelled: upload.isCancelled,
        lastCheckedAt: upload.lastCheckedAt,
        lastProgressAt: upload.lastProgressAt,
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
    courseId: string;
    courseTitle: string;
    mediaStatus: UploadState;
  }) => {
    if (input.mediaStatus !== "uploading" && input.mediaStatus !== "processing") return;

    setUploads((current) => {
      const existing = current[input.lessonId];
      if (existing) {
        return {
          ...current,
          [input.lessonId]: {
            ...existing,
            courseId: input.courseId,
            courseTitle: input.courseTitle,
            lessonTitle: input.lessonTitle,
          },
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
          requiresFile: false,
          isStalled: false,
          isCancelled: false,
          lastCheckedAt: null,
          lastProgressAt: new Date().toISOString(),
          error: null,
        },
      };
    });
  }, []);

  const refreshStatuses = useCallback(async () => {
    const pending = Object.values(uploadsRef.current).filter(
      shouldPoll,
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

            const checkedAt = new Date().toISOString();
            const madeProgress =
              payload.data!.mediaStatus !== current.mediaStatus ||
              (payload.data!.encodingProgress ?? null) !== current.processingProgress;
            const lastProgressAt = madeProgress ? checkedAt : current.lastProgressAt;

            return {
              ...current,
              mediaStatus: payload.data!.mediaStatus,
              processingProgress:
                payload.data!.mediaStatus === "processing"
                  ? payload.data!.encodingProgress
                  : current.processingProgress,
              requiresFile:
                current.requiresFile && payload.data!.mediaStatus === "uploading",
              isStalled:
                payload.data!.mediaStatus === "processing" &&
                Date.now() - new Date(lastProgressAt).getTime() >= STALLED_AFTER_MS,
              lastCheckedAt: checkedAt,
              lastProgressAt,
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

  const hasPollableUploads = Object.values(uploads).some(shouldPoll);

  useEffect(() => {
    if (!hasPollableUploads) {
      pollerRef.current?.stop();
      pollerRef.current = null;
      return;
    }

    const poller = createStatusPoller({
      poll: refreshStatuses,
      isVisible: () => document.visibilityState !== "hidden",
    });
    pollerRef.current = poller;
    poller.start();

    const handleFocus = () => poller.resume();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") poller.pause();
      else poller.resume();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      poller.stop();
      if (pollerRef.current === poller) pollerRef.current = null;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hasPollableUploads, refreshStatuses]);

  const startUpload = useCallback(async ({ courseId, courseTitle, lessonId, lessonTitle, fallbackStatus, file }: {
    courseId: string;
    courseTitle: string;
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
        courseId,
        courseTitle,
        lessonId,
        lessonTitle,
        mediaStatus: "uploading",
        uploadProgress: 0,
        processingProgress: null,
        isClientUpload: true,
        isPreparing: true,
        requiresFile: false,
        isStalled: false,
        isCancelled: false,
        lastCheckedAt: null,
        lastProgressAt: new Date().toISOString(),
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
            requiresFile: true,
            error: "تعذّر رفع الفيديو بعد إعادة المحاولة. تحقّق من اتصالك أو اختر الملف مرة أخرى.",
          }));
        },
        onProgress: (uploaded, total) => {
          if (total > 0) {
            updateUpload(lessonId, (currentUpload) => ({
              ...currentUpload,
              uploadProgress: Math.round((uploaded / total) * 100),
              lastProgressAt: new Date().toISOString(),
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
            lastProgressAt: new Date().toISOString(),
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

  const cancelUpload = useCallback(async (lessonId: string) => {
    const clientUpload = uploadsByLessonRef.current.get(lessonId);

    try {
      if (clientUpload) {
        try {
          await clientUpload.abort(true);
        } catch {
          // The authenticated backend cancellation remains authoritative even
          // when the browser cannot terminate its TUS request cleanly.
        }
      }
      const response = await fetch(`/api/instructor/lessons/${lessonId}/upload`, { method: "DELETE" });
      if (!response.ok) throw new Error("cancel failed");
      uploadsByLessonRef.current.delete(lessonId);
      updateUpload(lessonId, (current) => ({
        ...current,
        mediaStatus: "absent",
        uploadProgress: null,
        processingProgress: null,
        isClientUpload: false,
        isPreparing: false,
        requiresFile: false,
        isStalled: false,
        isCancelled: true,
        lastCheckedAt: new Date().toISOString(),
        error: null,
      }));
    } catch {
      updateUpload(lessonId, (current) => ({
        ...current,
        error: "تعذّر إلغاء الفيديو. سيستمر التحقق من حالته؛ حاول مرة أخرى.",
      }));
    }
  }, [updateUpload]);

  const dismissUpload = useCallback((lessonId: string) => {
    setUploads((current) => {
      const remaining = { ...current };
      delete remaining[lessonId];
      return remaining;
    });
  }, []);

  const value = useMemo<UploadManager>(() => ({
    uploads,
    trackLesson,
    startUpload,
    cancelUpload,
    dismissUpload,
  }), [cancelUpload, dismissUpload, startUpload, trackLesson, uploads]);

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
}

export function useInstructorUploads() {
  const manager = useContext(UploadManagerContext);
  if (!manager) throw new Error("Instructor uploads must be used within the Studio upload provider.");
  return manager;
}

export function InstructorUploadPanel() {
  const { cancelUpload, dismissUpload, uploads } = useInstructorUploads();
  const activeUploads = Object.values(uploads).filter((upload) =>
    isActive(upload) || upload.isCancelled || upload.mediaStatus === "ready" || upload.mediaStatus === "failed" || upload.error,
  );

  if (activeUploads.length === 0) return null;

  return (
    <aside aria-label="عمليات الفيديو الجارية" className={styles.panel}>
      <div className={styles.panelHeader}>
        <strong>عمليات الفيديو</strong>
        <span><bdi dir="ltr">{activeUploads.length}</bdi> متابعة</span>
      </div>
      <ul className={styles.uploadList}>
        {activeUploads.map((upload) => {
          const progress = progressFor(upload);
          const hasProgress = progress !== null && progress > 0;

          return (
            <li key={upload.lessonId}>
              <div className={styles.uploadHeading}>
                <Link href={`/studio/courses/${upload.courseId}#lesson-${upload.lessonId}`}>
                  <strong>{upload.lessonTitle}</strong>
                  <small>{upload.courseTitle}</small>
                </Link>
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
              ) : isActive(upload) ? <p>{upload.isPreparing ? "يجري الاتصال بخدمة الفيديو…" : upload.requiresFile ? "يلزم اختيار الملف من صفحة الدرس." : "يُحدّث تلقائيًا…"}</p> : null}
              <div className={styles.uploadMeta}>
                <small>{checkedLabel(upload.lastCheckedAt)}</small>
                {isActive(upload) && !upload.requiresFile ? (
                  <button onClick={() => void cancelUpload(upload.lessonId)} type="button">إلغاء</button>
                ) : (
                  <button onClick={() => dismissUpload(upload.lessonId)} type="button">إخفاء</button>
                )}
              </div>
              {upload.requiresFile ? <p className={styles.notice}>توقّف رفع الملف بعد إعادة تحميل الصفحة. افتح الدرس واختر الملف مرة أخرى.</p> : null}
              {upload.isStalled ? <p className={styles.notice}>لم يتقدم تجهيز الفيديو منذ مدة. يمكنك الانتظار أو مراجعة Bunny Stream ثم استبدال الفيديو.</p> : null}
              {upload.isCancelled ? <p className={styles.notice}>أُلغي الفيديو ولن يستمر رفعه أو تجهيزه.</p> : null}
              {upload.error ? <p className={styles.error} role="alert">{upload.error}</p> : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
