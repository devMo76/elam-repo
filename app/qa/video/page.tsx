"use client";

import { useState, type FormEvent } from "react";
import { Upload } from "tus-js-client";

import { directVideoUploadResponseSchema } from "@/lib/contracts";

const TEST_LESSON_ID = "40000000-0000-4000-8000-000000000003";

function getResponseError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "تعذر بدء رفع الفيديو.";
}

export default function VideoQaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("اختر فيديو MP4 قصيراً للاختبار.");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setMessage("جارٍ طلب تصريح رفع آمن...");

    try {
      const response = await fetch(
        `/api/instructor/lessons/${TEST_LESSON_ID}/upload`,
        {
          method: "POST",
          cache: "no-store",
        },
      );
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(getResponseError(payload));
      }

      const credentials = directVideoUploadResponseSchema.parse(payload);

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: credentials.data.upload.endpoint,
          headers: credentials.data.upload.headers,
          metadata: {
            filename: file.name,
            filetype: file.type || "video/mp4",
          },
          retryDelays: [0, 1_000, 3_000, 5_000],
          removeFingerprintOnSuccess: true,
          onError(error) {
            reject(error);
          },
          onProgress(bytesUploaded, bytesTotal) {
            const percentage =
              bytesTotal === 0 ? 0 : (bytesUploaded / bytesTotal) * 100;
            setProgress(Math.round(percentage));
            setMessage(`جارٍ الرفع مباشرة إلى Bunny Stream: ${percentage.toFixed(1)}%`);
          },
          onSuccess() {
            resolve();
          },
        });

        upload.start();
      });

      setProgress(100);
      setMessage(
        "اكتمل الرفع. انتظر معالجة Bunny ثم افحص حالة الدرس في Supabase.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "فشل رفع الفيديو.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-content-center gap-6 px-6 py-12">
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="font-mono text-sm text-elam-secondary">Phase 4 QA</p>
        <h1 className="mt-2 text-2xl font-semibold">اختبار رفع Bunny Stream</h1>
        <p className="mt-3 text-sm leading-7 text-black/70">
          صفحة مؤقتة لاختبار الرفع المباشر. لا تحتوي على أي مفتاح سري لـ
          Bunny.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            accept="video/mp4,video/*"
            disabled={isUploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
            type="file"
          />

          <button
            className="rounded-lg bg-elam-primary px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!file || isUploading}
            type="submit"
          >
            {isUploading ? "جارٍ الرفع..." : "ابدأ اختبار الرفع"}
          </button>
        </form>

        <div className="mt-5" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full bg-elam-secondary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm leading-6">{message}</p>
        </div>
      </section>
    </main>
  );
}
