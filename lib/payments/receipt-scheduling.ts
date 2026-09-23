import "server-only";

import { after } from "next/server";

import { attemptPaymentReceipt } from "@/lib/payments/receipt";

/**
 * Starts a best-effort delivery after the response is committed. The database
 * outbox remains the source of truth, so an interrupted process is recovered by
 * the receipt worker instead of affecting payment confirmation.
 */
export function schedulePaymentReceipt(orderId: string) {
  after(async () => {
    await attemptPaymentReceipt(orderId);
  });
}
