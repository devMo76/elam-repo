"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useInstructorNavigationBlocker } from "./InstructorNavigationBlocker";
import styles from "./StudioDialog.module.css";

export function StudioDialog({ open, title, onClose, children, drawer = false }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { isBusy, isBlocked } = useInstructorNavigationBlocker();
  function dismiss() {
    if (isBusy) return;
    if (isBlocked && !window.confirm("لديك تغييرات غير محفوظة. ستبقى هنا عند فتح النافذة مجددًا. هل تريد إغلاقها؟")) return;
    onClose();
  }
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) { dialog.close(); return; }
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, [open]);
  return (
    <dialog aria-labelledby={titleId} className={`${styles.dialog} ${drawer ? styles.drawer : ""}`} ref={ref}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]'))
          .filter((element) => {
            const closedDetails = element.closest("details:not([open])");
            return element.getClientRects().length > 0 && !element.closest("[hidden]") && getComputedStyle(element).visibility !== "hidden" &&
              (!closedDetails || Boolean(closedDetails.querySelector(":scope > summary")?.contains(element)));
          });
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
      } }}>
      <header className={styles.header}><h2 id={titleId}>{title}</h2>
        <button aria-label="إغلاق النافذة" disabled={isBusy} onClick={dismiss} type="button">إغلاق</button></header>
      {isBusy ? <p className={styles.busy} role="status">جارٍ حفظ التغيير؛ انتظر قبل إغلاق النافذة.</p> : null}
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
