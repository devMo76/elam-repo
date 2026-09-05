type PaymentReceiptTemplateInput = {
  learnerName: string;
  courseTitle: string;
  orderId: string;
  amountHalalas: number;
  currency: string;
  paidAt: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character];
  });
}

function singleLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function createPaymentReceiptEmail(
  input: PaymentReceiptTemplateInput,
) {
  const learnerName = singleLine(input.learnerName) || "طالبنا العزيز";
  const courseTitle = singleLine(input.courseTitle);
  const amount = new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: input.currency,
  }).format(input.amountHalalas / 100);
  const paidAt = new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "long",
    timeZone: "Asia/Riyadh",
  }).format(new Date(input.paidAt));
  const subject = `إيصال الدفع - ${courseTitle}`.slice(0, 200);

  return {
    subject,
    text: [
      `مرحباً ${learnerName}،`,
      "تم استلام دفعتك بنجاح.",
      `الدورة: ${courseTitle}`,
      `المبلغ: ${amount}`,
      `تاريخ الدفع: ${paidAt}`,
      `رقم الطلب: ${input.orderId}`,
      "شكراً لاستخدامك منصة إلِم.",
    ].join("\n"),
    html: `<!doctype html>
<html lang="ar" dir="rtl">
  <body style="font-family:Arial,sans-serif;color:#172033;line-height:1.7">
    <main style="max-width:600px;margin:0 auto;padding:24px">
      <h1 style="font-size:24px">إيصال الدفع</h1>
      <p>مرحباً ${escapeHtml(learnerName)}،</p>
      <p>تم استلام دفعتك بنجاح.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><th style="text-align:right;padding:8px">الدورة</th><td style="padding:8px">${escapeHtml(courseTitle)}</td></tr>
        <tr><th style="text-align:right;padding:8px">المبلغ</th><td style="padding:8px">${escapeHtml(amount)}</td></tr>
        <tr><th style="text-align:right;padding:8px">تاريخ الدفع</th><td style="padding:8px">${escapeHtml(paidAt)}</td></tr>
        <tr><th style="text-align:right;padding:8px">رقم الطلب</th><td style="padding:8px">${escapeHtml(input.orderId)}</td></tr>
      </table>
      <p>شكراً لاستخدامك منصة إلِم.</p>
    </main>
  </body>
</html>`,
  };
}
