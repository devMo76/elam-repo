import styles from "./AuthStatus.module.css";

export function AuthStatus({ status }: { status: "verified" | "confirmation-failed" | "password-updated" }) {
  const content = {
    verified: { title: "تم تفعيل بريدك الإلكتروني", body: "حسابك جاهز الآن. يمكنك تسجيل الدخول للمتابعة." },
    "confirmation-failed": { title: "تعذر تفعيل الحساب", body: "ربما انتهت صلاحية الرابط أو استُخدم سابقًا. سجّل الدخول أو اطلب رسالة تحقق جديدة." },
    "password-updated": { title: "تم تحديث كلمة المرور", body: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة." },
  }[status];

  return <div className={status === "confirmation-failed" ? styles.error : styles.success} role={status === "confirmation-failed" ? "alert" : "status"}><strong>{content.title}</strong><p>{content.body}</p></div>;
}
