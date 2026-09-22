"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import styles from "./AuthForm.module.css";

type AuthMode = "sign-in" | "register" | "password-reset";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };
};

const copy = {
  "sign-in": {
    title: "سجّل دخولك",
    description: "ارجع لدروسك وكمّل من حيث توقفت.",
    endpoint: "/api/auth/sign-in",
    action: "دخول",
  },
  register: {
    title: "أنشئ حسابك",
    description: "ابدأ باستخدام إلم بحساب واحد بسيط.",
    endpoint: "/api/auth/register",
    action: "إنشاء الحساب",
  },
  "password-reset": {
    title: "استعادة كلمة المرور",
    description: "أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.",
    endpoint: "/api/auth/password-reset",
    action: "إرسال رابط الاستعادة",
  },
} as const;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const content = copy[mode];
  const isRegister = mode === "register";
  const hasPassword = mode !== "password-reset";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(form);
    const body = {
      email: String(formData.get("email") ?? ""),
      ...(hasPassword ? { password: String(formData.get("password") ?? "") } : {}),
      ...(isRegister ? { fullName: String(formData.get("fullName") ?? "") } : {}),
    };

    try {
      const response = await fetch(content.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as ApiError | null;

      if (!response.ok) {
        const fieldError = payload?.error?.fieldErrors
          ? Object.values(payload.error.fieldErrors).flat()[0]
          : null;
        setError(fieldError ?? payload?.error?.message ?? "تعذر إكمال الطلب. حاول مرة أخرى.");
        return;
      }

      if (mode === "sign-in") {
        router.replace("/courses");
        router.refresh();
        return;
      }

      setMessage(
        mode === "register"
          ? "تحقق من بريدك لتفعيل الحساب، ثم سجّل دخولك."
          : "إذا كان البريد مسجلاً، فسيصلك رابط الاستعادة قريبًا.",
      );
      form.reset();
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من اتصالك ثم حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="auth-heading">
      <div className={styles.heading}>
        <h1 id="auth-heading">{content.title}</h1>
        <p>{content.description}</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        {isRegister ? (
          <label>
            الاسم الكامل
            <input autoComplete="name" name="fullName" required type="text" />
          </label>
        ) : null}
        <label>
          البريد الإلكتروني
          <input autoComplete="email" dir="ltr" name="email" required type="email" />
        </label>
        {hasPassword ? (
          <label>
            كلمة المرور
            <input
              autoComplete={isRegister ? "new-password" : "current-password"}
              dir="ltr"
              minLength={isRegister ? 8 : 1}
              name="password"
              required
              type="password"
            />
          </label>
        ) : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {message ? <p className={styles.message} role="status">{message}</p> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "جارٍ الإرسال…" : content.action}
        </button>
      </form>
      <nav className={styles.links} aria-label="روابط الحساب">
        {mode === "sign-in" ? (
          <>
            <Link href="/auth/register">حساب جديد</Link>
            <Link href="/auth/password-reset">نسيت كلمة المرور؟</Link>
          </>
        ) : (
          <Link href="/auth/sign-in">العودة إلى تسجيل الدخول</Link>
        )}
      </nav>
    </section>
  );
}
type CurrentAuthMode = "sign-in" | "register" | "password-reset" | "reset-password";

type CurrentApiError = {
  error?: {
    code?: string;
    fieldErrors?: Record<string, string[]>;
  };
};

type CurrentFieldErrors = Partial<
  Record<"email" | "password" | "fullName" | "confirmPassword", string>
>;

const currentCopy = {
  "sign-in": { title: "سجّل دخولك", description: "ارجع لدروسك وكمّل من حيث توقفت.", endpoint: "/api/auth/sign-in", method: "POST", action: "دخول" },
  register: { title: "أنشئ حسابك", description: "ابدأ باستخدام إلم بحساب واحد بسيط.", endpoint: "/api/auth/register", method: "POST", action: "إنشاء الحساب" },
  "password-reset": { title: "استعادة كلمة المرور", description: "أدخل بريدك وسنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.", endpoint: "/api/auth/password-reset", method: "POST", action: "إرسال رابط الاستعادة" },
  "reset-password": { title: "تعيين كلمة مرور جديدة", description: "اختر كلمة مرور جديدة لا تقل عن 8 أحرف.", endpoint: "/api/auth/password", method: "PATCH", action: "حفظ كلمة المرور" },
} as const;

const fallbackError = "تعذر إكمال الطلب. حاول مرة أخرى.";

function authHref(pathname: string, redirectTo: string) {
  return `${pathname}?next=${encodeURIComponent(redirectTo)}`;
}

function arabicError(response: Response, payload: CurrentApiError | null) {
  if (response.status === 429 || payload?.error?.code === "rate_limited") return "كثرت المحاولات. انتظر قليلًا ثم حاول مرة أخرى.";
  if (payload?.error?.code === "authentication_required") return "انتهت صلاحية رابط الاستعادة. اطلب رابطًا جديدًا ثم حاول مرة أخرى.";
  if (response.status === 401) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  return fallbackError;
}

function arabicFieldErrors(payload: CurrentApiError | null): CurrentFieldErrors {
  const fields = payload?.error?.fieldErrors;
  if (!fields) return {};
  return {
    ...(fields.fullName ? { fullName: "أدخل الاسم الكامل كما سيظهر في حسابك." } : {}),
    ...(fields.email ? { email: "أدخل بريدًا إلكترونيًا صحيحًا." } : {}),
    ...(fields.password ? { password: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل." } : {}),
  };
}

export function AuthPanel({ mode, redirectTo = "/account" }: { mode: CurrentAuthMode; redirectTo?: string }) {
  const router = useRouter();
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CurrentFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const content = currentCopy[mode];
  const isRegister = mode === "register";
  const isResetRequest = mode === "password-reset";
  const isPasswordUpdate = mode === "reset-password";
  const hasPassword = !isResetRequest;

  async function post(endpoint: string, method: "POST" | "PATCH", body: object) {
    const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = (await response.json().catch(() => null)) as CurrentApiError | null;
    return { response, payload };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    setError(null); setMessage(null); setFieldErrors({});
    if (isPasswordUpdate && password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "كلمتا المرور غير متطابقتين." });
      requestAnimationFrame(() => {
        const confirmPasswordField = form.elements.namedItem("confirmPassword");

        if (confirmPasswordField instanceof HTMLElement) {
          confirmPasswordField.focus();
        } else {
          errorSummaryRef.current?.focus();
        }
      });
      return;
    }
    setIsSubmitting(true);
    const body = { ...(!isPasswordUpdate ? { email: String(formData.get("email") ?? "") } : {}), ...(hasPassword ? { password } : {}), ...(isRegister ? { fullName: String(formData.get("fullName") ?? ""), next: redirectTo } : {}) };
    try {
      const { response, payload } = await post(content.endpoint, content.method, body);
      if (!response.ok) {
        const nextFieldErrors = arabicFieldErrors(payload);
        setFieldErrors(nextFieldErrors);
        setError(Object.keys(nextFieldErrors).length > 0 ? "راجع الحقول المحددة ثم حاول مرة أخرى." : arabicError(response, payload));
        requestAnimationFrame(() => {
          const firstField = Object.keys(nextFieldErrors)[0];
          const control = firstField
            ? form.elements.namedItem(firstField)
            : null;

          if (control instanceof HTMLElement) control.focus();
          else errorSummaryRef.current?.focus();
        });
        return;
      }
      if (mode === "sign-in") { router.replace(redirectTo); router.refresh(); return; }
      if (isPasswordUpdate) { router.replace("/auth/sign-in?password=updated"); router.refresh(); return; }
      if (isRegister) { setPendingConfirmationEmail(String(formData.get("email") ?? "")); setMessage("تحقق من بريدك الإلكتروني لتفعيل الحساب. بعد التأكيد سنعيدك إلى الصفحة التي بدأت منها."); }
      else { setMessage("إذا كان البريد مسجلًا، فسيصلك رابط الاستعادة قريبًا."); form.reset(); }
    } catch {
      setError("تعذر الاتصال بالخدمة. تحقق من اتصالك ثم حاول مرة أخرى.");
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
    finally { setIsSubmitting(false); }
  }

  async function handleResend() {
    if (pendingConfirmationEmail === null) return;
    setError(null); setMessage(null); setIsSubmitting(true);
    try {
      const { response, payload } = await post("/api/auth/resend-confirmation", "POST", { email: pendingConfirmationEmail, next: redirectTo });
      if (!response.ok) { setError(arabicError(response, payload)); return; }
      setMessage("إذا كان الحساب بحاجة للتفعيل، أرسلنا رسالة تحقق جديدة.");
    } catch { setError("تعذر الاتصال بالخدمة. تحقق من اتصالك ثم حاول مرة أخرى."); }
    finally { setIsSubmitting(false); }
  }

  return <section className={styles.card} aria-labelledby="auth-heading">
    <div className={styles.heading}><h1 id="auth-heading">{content.title}</h1><p>{content.description}</p>{redirectTo !== "/account" && (mode === "sign-in" || mode === "register") ? <p>بعد إكمال الدخول سنعيدك إلى الصفحة التي بدأت منها.</p> : null}</div>
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {isRegister ? <label>الاسم الكامل<input aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined} aria-invalid={Boolean(fieldErrors.fullName)} autoComplete="name" name="fullName" required type="text" />{fieldErrors.fullName ? <span id="fullName-error">{fieldErrors.fullName}</span> : null}</label> : null}
      {!isPasswordUpdate ? <label>البريد الإلكتروني<input aria-describedby={fieldErrors.email ? "email-error" : undefined} aria-invalid={Boolean(fieldErrors.email)} autoComplete="email" dir="ltr" inputMode="email" name="email" required type="email" />{fieldErrors.email ? <span id="email-error">{fieldErrors.email}</span> : null}</label> : null}
      {hasPassword ? <label>كلمة المرور<input aria-describedby={fieldErrors.password ? "password-error" : undefined} aria-invalid={Boolean(fieldErrors.password)} autoComplete={isRegister || isPasswordUpdate ? "new-password" : "current-password"} dir="ltr" minLength={isRegister || isPasswordUpdate ? 8 : 1} name="password" required type="password" />{fieldErrors.password ? <span id="password-error">{fieldErrors.password}</span> : null}</label> : null}
      {isPasswordUpdate ? <label>تأكيد كلمة المرور<input aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined} aria-invalid={Boolean(fieldErrors.confirmPassword)} autoComplete="new-password" dir="ltr" minLength={8} name="confirmPassword" required type="password" />{fieldErrors.confirmPassword ? <span id="confirmPassword-error">{fieldErrors.confirmPassword}</span> : null}</label> : null}
      {error ? <p className={styles.error} id="auth-error-summary" ref={errorSummaryRef} role="alert" tabIndex={-1}>{error}</p> : null}
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      <button disabled={isSubmitting} type="submit">{isSubmitting ? "جارٍ الإرسال…" : content.action}</button>
    </form>
    {pendingConfirmationEmail ? <button className={styles.secondaryAction} disabled={isSubmitting} onClick={handleResend} type="button">إعادة إرسال رسالة التحقق</button> : null}
    <nav className={styles.links} aria-label="روابط الحساب">{mode === "sign-in" ? <><Link href={authHref("/auth/register", redirectTo)}>حساب جديد</Link><Link href="/auth/password-reset">نسيت كلمة المرور؟</Link></> : <Link href={authHref("/auth/sign-in", redirectTo)}>العودة إلى تسجيل الدخول</Link>}</nav>
  </section>;
}
