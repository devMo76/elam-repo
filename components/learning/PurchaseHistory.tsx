"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LearnerPurchase } from "@/lib/payments/history";
import styles from "./LearnerDashboard.module.css";

const dateFormatter = new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" });
const amountFormatter = new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" });

const orderStatusLabels: Record<LearnerPurchase["status"], string> = {
  pending: "قيد التحقق", paid: "تم الدفع", failed: "لم يكتمل الدفع",
  refunded: "مسترد", reversed: "ملغى",
};

export function PurchaseHistory({ purchases, returnPaymentId }: {
  purchases: LearnerPurchase[];
  returnPaymentId: string | null;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function recheck(target: { orderId: string } | { paymentId: string }, busyKey: string) {
    setBusyId(busyKey);
    setNotice(null);
    try {
      const response = await fetch("/api/payments/recheck", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target),
      });
      const payload = await response.json() as { data?: { status: LearnerPurchase["status"]; accessGranted: boolean }; error?: { code: string } };
      if (!response.ok || !payload.data) {
        setNotice(payload.error?.code === "payment_reference_missing"
          ? "مرجع الدفع لم يصل بعد. احتفظ برقم الطلب وتواصل مع الدعم إذا استمر الانتظار."
          : "تعذّر التحقق الآن. لم تُنشأ عملية دفع جديدة؛ حاول لاحقًا.");
        return;
      }
      setNotice(payload.data.accessGranted
        ? "تأكد الدفع، والمادة متاحة الآن في مكتبتك."
        : payload.data.status === "pending"
          ? "ما زال الدفع قيد التحقق. حاول لاحقًا."
          : "تم تحديث حالة العملية. إذا دُفع المبلغ ولم يظهر الوصول، احتفظ برقم الطلب وتواصل مع الدعم.");
      router.refresh();
    } catch {
      setNotice("تعذّر الاتصال بالخدمة. لم تُنشأ عملية دفع جديدة.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="purchases-heading" className={styles.section}>
      <div className={styles.sectionHeader}><h2 id="purchases-heading">عمليات الشراء</h2></div>
      {returnPaymentId ? (
        <div className={styles.purchaseNotice}>
          <p>إذا رجعت من بوابة الدفع وما ظهرت المادة، تحقق من العملية نفسها دون دفع جديد.</p>
          <button disabled={busyId !== null} onClick={() => void recheck({ paymentId: returnPaymentId }, returnPaymentId)} type="button">
            {busyId === returnPaymentId ? "جارٍ التحقق…" : "التحقق من الدفع"}
          </button>
        </div>
      ) : null}
      {notice ? <p aria-live="polite" className={styles.purchaseNotice} role="status">{notice}</p> : null}
      {purchases.length === 0 ? <p className={styles.purchaseEmpty}>ما عندك عمليات شراء بعد.</p> : (
        <div className={styles.purchaseList}>
          {purchases.map((purchase) => {
            const needsRecovery = purchase.status === "pending" || (purchase.status === "paid" && !purchase.hasAccess);
            return (
              <article className={styles.purchase} key={purchase.orderId}>
                <div>
                  <h3>{purchase.courseTitle}</h3>
                  <p>{orderStatusLabels[purchase.status]} · <bdi>{amountFormatter.format(purchase.amountHalalas / 100)}</bdi> · {dateFormatter.format(new Date(purchase.createdAt))}</p>
                  <p className={styles.orderId}>رقم الطلب: <bdi dir="ltr">{purchase.orderId}</bdi></p>
                  {purchase.status === "paid" ? <p>الإيصال: {purchase.receiptStatus === "sent" ? "أُرسل إلى بريدك" : "قيد الإرسال أو إعادة المحاولة"}</p> : null}
                  {purchase.status === "paid" && !purchase.hasAccess ? <p role="alert">الدفع مسجل، لكن الوصول غير ظاهر. تحقق من العملية أو تواصل مع الدعم برقم الطلب.</p> : null}
                  {purchase.status === "pending" && !purchase.paymentId ? <p>بانتظار مرجع بوابة الدفع. إذا طال الانتظار، تواصل مع الدعم برقم الطلب.</p> : null}
                </div>
                <div className={styles.purchaseActions}>
                  {purchase.status === "paid" && purchase.hasAccess ? <Link href={`/learn/courses/${purchase.courseId}`}>افتح المادة</Link> : null}
                  {needsRecovery && purchase.paymentId ? (
                    <button disabled={busyId !== null} onClick={() => void recheck({ orderId: purchase.orderId }, purchase.orderId)} type="button">
                      {busyId === purchase.orderId ? "جارٍ التحقق…" : "تحقق من العملية"}
                    </button>
                  ) : null}
                  {purchase.status === "failed" && purchase.courseSlug ? <Link href={`/courses/${purchase.courseSlug}`}>العودة للمادة</Link> : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
