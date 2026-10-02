"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "./InstructorWorkspace.module.css";

type PdfInfo = { fileName: string; byteSize: number };

export function InstructorLessonPdf({ lessonId }: { lessonId: string }) {
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/instructor/lessons/${lessonId}/pdf`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { data: PdfInfo | null }) => setInfo(payload.data))
      .catch(() => { if (!controller.signal.aborted) setMessage("تعذّر تحميل المرفق."); });
    return () => controller.abort();
  }, [lessonId]);

  async function upload() {
    if (!file) return;
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) {
      setMessage("اختر ملف PDF لا يزيد عن 20 ميجابايت.");
      return;
    }
    setBusy(true);
    setMessage("جارٍ رفع المرفق…");
    try {
      const prepare = await fetch(`/api/instructor/lessons/${lessonId}/pdf`, { method: "POST" });
      if (!prepare.ok) throw new Error();
      const prepared = await prepare.json() as { data: { path: string; token: string } };
      setMessage("جارٍ رفع المرفق إلى التخزين الخاص…");
      const upload = await createClient().storage.from("lesson-pdfs").uploadToSignedUrl(
        prepared.data.path, prepared.data.token, file, { contentType: "application/pdf" },
      );
      if (upload.error) throw new Error();
      setMessage("جارٍ التحقق من الملف…");
      const response = await fetch(`/api/instructor/lessons/${lessonId}/pdf`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: prepared.data.path, fileName: file.name, byteSize: file.size }),
      });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { data: PdfInfo };
      setInfo(payload.data);
      setFile(null);
      setMessage("تم حفظ المرفق.");
    } catch {
      setMessage("تعذّر رفع المرفق. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}/pdf`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setInfo(null);
      setMessage("تم حذف المرفق.");
    } catch {
      setMessage("تعذّر حذف المرفق.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.pdfAttachment}>
      <label htmlFor={`lesson-pdf-${lessonId}`}>ملف PDF للدرس (اختياري)</label>
      {info ? <p>{info.fileName} · {Math.ceil(info.byteSize / 1024)} KB</p> : null}
      <input accept="application/pdf,.pdf" disabled={busy} id={`lesson-pdf-${lessonId}`}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
      <div className={styles.rowActions}>
        <button className={styles.textButton} disabled={!file || busy} onClick={() => void upload()} type="button">
          {info ? "استبدال الملف" : "رفع الملف"}
        </button>
        {info ? <button className={styles.dangerTextButton} disabled={busy} onClick={() => void remove()} type="button">حذف الملف</button> : null}
      </div>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
