"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import type { CheckoutResponse } from "@/lib/contracts";
import { loadMoyasarAssets } from "@/lib/payments/moyasar-assets";

import styles from "./CourseAccessActions.module.css";

type ApiError = { error?: { code?: string } };

type MoyasarConfiguration = {
  amount: number;
  callback_url: string;
  currency: "SAR";
  description: string;
  element: HTMLElement;
  fixed_width: boolean;
  language: "ar";
  metadata: { order_id: string };
  methods: ["creditcard"];
  publishable_api_key: string;
  supported_networks: ["mada", "visa", "mastercard"];
  on_failure: (message: string) => void;
};

declare global {
  interface Window {
    Moyasar?: { init: (configuration: MoyasarConfiguration) => void };
  }
}

function checkoutErrorMessage(code?: string) {
  switch (code) {
    case "email_verification_required":
      return "فعّل بريدك الإلكتروني أولًا، ثم أكمل التسجيل في المادة.";
    case "learner_required":
      return "شراء المواد متاح لحساب المتعلّم.";
    case "already_enrolled":
      return "هذه المادة موجودة بالفعل في مكتبتك.";
    case "course_not_available":
      return "هذه المادة غير متاحة للشراء حاليًا.";
    case "payment_configuration_invalid":
      return "إعدادات الدفع غير مكتملة حاليًا. لم تُخصم أي مبالغ؛ حاول مرة أخرى لاحقًا.";
    default:
      return "تعذّر تجهيز الدفع. حدّث الصفحة ثم حاول مرة أخرى.";
  }
}

export function PaidCourseCheckoutButton({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const paymentRegionId = useId();
  const purchaseButtonRef = useRef<HTMLButtonElement>(null);
  const paymentMountRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const initializedOrderRef = useRef<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse["data"] | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const paymentMount = paymentMountRef.current;
    let announcementFrame: number | null = null;
    if (
      !checkout ||
      !paymentMount ||
      !window.Moyasar ||
      initializedOrderRef.current === checkout.orderId
    ) {
      return;
    }

    try {
      initializedOrderRef.current = checkout.orderId;
      paymentMount.replaceChildren();
      window.Moyasar.init({
        element: paymentMount,
        amount: checkout.amount,
        callback_url: checkout.callbackUrl,
        currency: checkout.currency,
        description: checkout.description,
        fixed_width: false,
        language: "ar",
        metadata: checkout.metadata,
        methods: ["creditcard"],
        publishable_api_key: checkout.publishableApiKey,
        supported_networks: ["mada", "visa", "mastercard"],
        on_failure: () => {
          setError("لم تكتمل عملية الدفع. راجع بيانات البطاقة ثم حاول مرة أخرى.");
          requestAnimationFrame(() => errorRef.current?.focus());
        },
      });
      announcementFrame = requestAnimationFrame(() => {
        setStatus("نموذج الدفع جاهز. أدخل بيانات البطاقة لإكمال الاشتراك.");
        paymentMount.focus();
      });
    } catch {
      initializedOrderRef.current = null;
      announcementFrame = requestAnimationFrame(() => {
        setCheckout(null);
        setError("تعذّر تشغيل نموذج الدفع. لم تُخصم أي مبالغ؛ حاول مرة أخرى.");
        purchaseButtonRef.current?.focus();
      });
    }

    return () => {
      if (announcementFrame !== null) cancelAnimationFrame(announcementFrame);
    };
  }, [checkout]);

  async function prepareCheckout() {
    if (isPreparing) return;

    setError(null);
    setStatus("جارٍ تحميل بوابة الدفع وتجهيز طلبك…");
    setIsPreparing(true);

    try {
      const gatewayResult = loadMoyasarAssets().then(
        () => ({ ready: true as const }),
        () => ({ ready: false as const }),
      );
      const response = await fetch("/api/checkout", {
        body: JSON.stringify({ courseId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | CheckoutResponse
        | ApiError
        | null;

      if (response.status === 401) {
        router.push(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok || !payload || !("data" in payload)) {
        setError(checkoutErrorMessage((payload as ApiError | null)?.error?.code));
        setStatus(null);
        requestAnimationFrame(() => purchaseButtonRef.current?.focus());
        return;
      }

      const gateway = await gatewayResult;
      if (!gateway.ready) {
        setError("تعذّر تحميل بوابة الدفع. تحقّق من اتصالك ثم أعد المحاولة.");
        setStatus(null);
        requestAnimationFrame(() => purchaseButtonRef.current?.focus());
        return;
      }

      initializedOrderRef.current = null;
      setCheckout(payload.data);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من اتصالك ثم حاول مرة أخرى.");
      setStatus(null);
      requestAnimationFrame(() => purchaseButtonRef.current?.focus());
    } finally {
      setIsPreparing(false);
    }
  }

  function cancelCheckout() {
    initializedOrderRef.current = null;
    paymentMountRef.current?.replaceChildren();
    setCheckout(null);
    setError(null);
    setStatus("أُغلق نموذج الدفع ولم تُخصم أي مبالغ.");
    requestAnimationFrame(() => purchaseButtonRef.current?.focus());
  }

  return (
    <div aria-busy={isPreparing} className={styles.actionGroup}>
      {!checkout ? (
        <button
          aria-controls={paymentRegionId}
          className={styles.primaryAction}
          disabled={isPreparing}
          onClick={prepareCheckout}
          ref={purchaseButtonRef}
          type="button"
        >
          {isPreparing
            ? "جارٍ تجهيز الدفع…"
            : error
              ? "إعادة محاولة الدفع"
              : "اشترك في المادة"}
        </button>
      ) : (
        <section aria-labelledby={`${paymentRegionId}-title`} className={styles.paymentPanel} id={paymentRegionId}>
          <div className={styles.paymentHeader}>
            <h2 id={`${paymentRegionId}-title`}>إتمام الدفع</h2>
            <button className={styles.cancelPayment} onClick={cancelCheckout} type="button">إلغاء</button>
          </div>
          <div
            aria-label="نموذج الدفع الآمن"
            className={styles.paymentForm}
            ref={paymentMountRef}
            tabIndex={-1}
          />
        </section>
      )}
      {status ? <p aria-live="polite" className={styles.paymentStatus} role="status">{status}</p> : null}
      {error ? <p ref={errorRef} role="alert" tabIndex={-1}>{error}</p> : null}
    </div>
  );
}
