"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { CheckoutResponse } from "@/lib/contracts";

import styles from "./CourseAccessActions.module.css";

const MOYASAR_CSS_URL = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.css";
const MOYASAR_SCRIPT_URL = "https://cdn.moyasar.com/mpf/1.15.0/moyasar.js";

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
    default:
      return "تعذّر تجهيز الدفع. حدّث الصفحة ثم حاول مرة أخرى.";
  }
}

function loadMoyasarAssets(onReady: () => void, onError: () => void) {
  if (window.Moyasar) {
    onReady();
    return () => undefined;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${MOYASAR_SCRIPT_URL}"]`,
  );
  const existingStyles = document.querySelector<HTMLLinkElement>(
    `link[href="${MOYASAR_CSS_URL}"]`,
  );

  if (!existingStyles) {
    const stylesheet = document.createElement("link");
    stylesheet.href = MOYASAR_CSS_URL;
    stylesheet.rel = "stylesheet";
    document.head.append(stylesheet);
  }

  const script = existingScript ?? document.createElement("script");
  if (!existingScript) {
    script.src = MOYASAR_SCRIPT_URL;
    script.async = true;
    document.head.append(script);
  }

  script.addEventListener("load", onReady);
  script.addEventListener("error", onError);

  return () => {
    script.removeEventListener("load", onReady);
    script.removeEventListener("error", onError);
  };
}

export function PaidCourseCheckoutButton({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const paymentMountRef = useRef<HTMLDivElement>(null);
  const initializedOrderRef = useRef<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse["data"] | null>(null);
  const [isGatewayReady, setIsGatewayReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return loadMoyasarAssets(
      () => setIsGatewayReady(true),
      () => setError("تعذّر تحميل بوابة الدفع. تحقّق من اتصالك ثم حاول مرة أخرى."),
    );
  }, []);

  useEffect(() => {
    const paymentMount = paymentMountRef.current;
    if (
      !checkout ||
      !isGatewayReady ||
      !paymentMount ||
      !window.Moyasar ||
      initializedOrderRef.current === checkout.orderId
    ) {
      return;
    }

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
      },
    });
  }, [checkout, isGatewayReady]);

  async function prepareCheckout() {
    setError(null);
    setIsPreparing(true);

    try {
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
        return;
      }

      initializedOrderRef.current = null;
      setCheckout(payload.data);
    } catch {
      setError("تعذّر الاتصال بالخدمة. تحقّق من اتصالك ثم حاول مرة أخرى.");
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className={styles.actionGroup}>
      {!checkout ? (
        <button
          className={styles.primaryAction}
          disabled={isPreparing || !isGatewayReady}
          onClick={prepareCheckout}
          type="button"
        >
          {isPreparing
            ? "جارٍ تجهيز الدفع…"
            : isGatewayReady
              ? "اشترك في المادة"
              : "جارٍ تجهيز بوابة الدفع…"}
        </button>
      ) : (
        <div
          aria-label="نموذج الدفع الآمن"
          className={styles.paymentForm}
          ref={paymentMountRef}
        />
      )}
      {error ? <p aria-live="polite" role="alert">{error}</p> : null}
    </div>
  );
}
