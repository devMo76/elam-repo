import { describe, expect, it } from "vitest";

import { createPaymentReceiptEmail } from "@/lib/email/templates/payment-receipt";

describe("payment receipt email template", () => {
  it("includes the receipt details in both email formats", () => {
    const email = createPaymentReceiptEmail({
      learnerName: "Learner One",
      courseTitle: "Backend Basics",
      orderId: "70000000-0000-4000-8000-000000000001",
      amountHalalas: 35000,
      currency: "SAR",
      paidAt: "2026-09-02T10:00:00.000Z",
    });

    expect(email.subject).toContain("Backend Basics");
    expect(email.text).toContain("Learner One");
    expect(email.text).toContain("70000000-0000-4000-8000-000000000001");
    expect(email.html).toContain('dir="rtl"');
  });

  it("escapes stored text before placing it in HTML", () => {
    const email = createPaymentReceiptEmail({
      learnerName: "<script>alert(1)</script>",
      courseTitle: "Course & <Unsafe>",
      orderId: "order-1",
      amountHalalas: 100,
      currency: "SAR",
      paidAt: "2026-09-02T10:00:00.000Z",
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Course &amp; &lt;Unsafe&gt;");
  });
});
