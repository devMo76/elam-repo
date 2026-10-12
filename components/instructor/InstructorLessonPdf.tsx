"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import styles from "./InstructorWorkspace.module.css";
import { useInstructorPendingOperation } from "./InstructorNavigationBlocker";

type PdfInfo = { fileName: string; byteSize: number };

export function InstructorLessonPdf({ lessonId, editable = true }: { lessonId: string; editable?: boolean }) {
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const operationInFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  useInstructorPendingOperation(busy);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/instructor/lessons/${lessonId}/pdf`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { data: PdfInfo | null }) => setInfo(payload.data))
      .catch(() => { if (!controller.signal.aborted) setMessage("تعذّر تحميل المرفق."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [lessonId]);

  async function upload(file: File) {
    if (operationInFlight.current) return;
    if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024) {
      setMessage("اختر ملف PDF لا يزيد عن 20 ميجابايت.");
      return;
    }
    operationInFlight.current = true;
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
      setMessage("تم حفظ المرفق.");
    } catch {
      setMessage("تعذّر رفع المرفق. حاول مرة أخرى.");
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    try {
      const response = await fetch(`/api/instructor/lessons/${lessonId}/pdf`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setInfo(null);
      setMessage("تم حذف المرفق.");
    } catch {
      setMessage("تعذّر حذف المرفق.");
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div aria-busy={busy || loading} className={styles.pdfAttachment}>
      <span id={`lesson-pdf-label-${lessonId}`}>ملف PDF للدرس (اختياري)</span>
      {loading ? <div aria-label="جارٍ تحميل المرفق" className={styles.skeleton} role="status"><div /></div> : null}
      {info ? <p><bdi>{info.fileName}</bdi> · <bdi>{Math.ceil(info.byteSize / 1024)} KB</bdi></p> : null}
      <input accept="application/pdf,.pdf" aria-labelledby={`lesson-pdf-label-${lessonId}`} disabled={busy || !editable} hidden ref={fileInput}
        onChange={(event) => {
          const selected = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (selected) void upload(selected);
        }} type="file" />
      {editable ? <div className={styles.rowActions}>
        <button aria-describedby={`lesson-pdf-status-${lessonId}`} className={styles.quietButton} disabled={busy} onClick={() => fileInput.current?.click()} type="button">
          {busy ? "جارٍ التنفيذ…" : info ? "استبدال الملف" : "رفع الملف"}
        </button>
        {info ? <button className={styles.dangerTextButton} disabled={busy} onClick={() => void remove()} type="button">حذف الملف</button> : null}
      </div> : <small>مرفق منشور؛ الاستبدال والحذف غير متاحين.</small>}
      <span aria-live="polite" id={`lesson-pdf-status-${lessonId}`}>{message}</span>
    </div>
  );
}
