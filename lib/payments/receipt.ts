import "server-only";

import { ResendApiError, sendEmail } from "@/lib/email/resend";
import { createPaymentReceiptEmail } from "@/lib/email/templates/payment-receipt";
import { createAdminClient } from "@/lib/supabase/admin";

class ReceiptDeliveryError extends Error {
  constructor(public readonly code: string) {
    super("Payment receipt delivery failed");
    this.name = "ReceiptDeliveryError";
  }
}

function getSafeErrorCode(error: unknown) {
  if (error instanceof ReceiptDeliveryError || error instanceof ResendApiError) {
    return error.code;
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "email_provider_timeout";
  }

  return "receipt_delivery_failed";
}

export async function attemptPaymentReceipt(orderId: string) {
  let admin: ReturnType<typeof createAdminClient> | undefined;
  let receiptClaimed = false;
  let providerAcceptedEmail = false;

  try {
    admin = createAdminClient();

    const { data: claims, error: claimError } = await admin.rpc(
      "claim_payment_receipt",
      { target_order: orderId },
    );

    if (claimError) {
      throw new ReceiptDeliveryError("receipt_claim_failed");
    }

    const claim = claims[0];

    if (!claim?.should_send) {
      return { status: "skipped" as const };
    }

    receiptClaimed = true;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("user_id, course_id, amount_halalas, currency, paid_at, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order || order.status !== "paid" || !order.paid_at) {
      throw new ReceiptDeliveryError("receipt_order_invalid");
    }

    const [courseResult, profileResult, userResult] = await Promise.all([
      admin.from("courses").select("title").eq("id", order.course_id).maybeSingle(),
      admin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle(),
      admin.auth.admin.getUserById(order.user_id),
    ]);

    if (courseResult.error || !courseResult.data) {
      throw new ReceiptDeliveryError("receipt_course_missing");
    }

    if (profileResult.error || !profileResult.data) {
      throw new ReceiptDeliveryError("receipt_profile_missing");
    }

    const recipientEmail = userResult.data.user?.email;

    if (userResult.error || !recipientEmail) {
      throw new ReceiptDeliveryError("receipt_email_missing");
    }

    const email = createPaymentReceiptEmail({
      learnerName: profileResult.data.full_name,
      courseTitle: courseResult.data.title,
      orderId,
      amountHalalas: order.amount_halalas,
      currency: order.currency,
      paidAt: order.paid_at,
    });
    const sentEmail = await sendEmail({
      idempotencyKey: `payment-receipt/${orderId}`,
      to: recipientEmail,
      ...email,
    });

    providerAcceptedEmail = true;

    const { error: completeError } = await admin.rpc(
      "complete_payment_receipt",
      {
        target_order: orderId,
        email_id: sentEmail.id,
      },
    );

    if (completeError) {
      throw new ReceiptDeliveryError("receipt_completion_failed");
    }

    return { status: "sent" as const };
  } catch (error) {
    const code = getSafeErrorCode(error);

    // If Resend accepted the email, keep the active lease. A later attempt can
    // reuse the same idempotency key instead of marking a delivered email failed.
    if (admin && receiptClaimed && !providerAcceptedEmail) {
      try {
        await admin.rpc("record_payment_receipt_failure", {
          target_order: orderId,
          error_code: code,
        });
      } catch {
        // Payment confirmation must remain successful even if failure tracking
        // is temporarily unavailable.
      }
    }

    return { status: "failed" as const, code };
  }
}

export async function processPendingPaymentReceipts(limit = 25) {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const admin = createAdminClient();
  const { data: receipts, error } = await admin
    .from("payment_receipts")
    .select("order_id")
    .neq("status", "sent")
    .order("updated_at", { ascending: true })
    .limit(boundedLimit);

  if (error) {
    throw new ReceiptDeliveryError("receipt_queue_read_failed");
  }

  const pendingReceipts = receipts ?? [];
  const summary = { selected: pendingReceipts.length, sent: 0, failed: 0, skipped: 0 };

  // Keep provider pressure bounded while allowing a scheduled run to make
  // progress within a typical serverless execution window.
  for (let index = 0; index < pendingReceipts.length; index += 3) {
    const results = await Promise.all(
      pendingReceipts
        .slice(index, index + 3)
        .map(({ order_id: orderId }) => attemptPaymentReceipt(orderId)),
    );

    for (const result of results) {
      summary[result.status] += 1;
    }
  }

  return summary;
}
