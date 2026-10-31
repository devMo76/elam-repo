import { z } from "zod";

import { createApiError } from "@/lib/http/api-response";
import { checkRateLimits } from "@/lib/http/rate-limit";
import { confirmMoyasarPayment, PaymentConfirmationError } from "@/lib/payments/confirmation";
import { schedulePaymentReceipt } from "@/lib/payments/receipt-scheduling";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const recheckRequestSchema = z.union([
  z.strictObject({ orderId: z.uuid() }),
  z.strictObject({ paymentId: z.uuid() }),
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return createApiError(401, "unauthenticated", "Sign-in is required.");

  const body = recheckRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return createApiError(400, "invalid_recheck", "A valid payment or order ID is required.");

  const limited = await checkRateLimits(request, [
    { action: "payment_recheck", limit: 12, windowSeconds: 600, subject: user.id },
  ]);
  if (limited) return limited;

  let paymentId: string;
  if ("orderId" in body.data) {
    // This column is intentionally unavailable to authenticated clients.
    // The service-role lookup must remain scoped to the verified owner.
    const { data: order, error } = await createAdminClient().from("orders")
      .select("status, moyasar_payment_id").eq("id", body.data.orderId)
      .eq("user_id", user.id).maybeSingle();
    if (error) return createApiError(500, "order_lookup_failed", "The order could not be checked.");
    if (!order) return createApiError(404, "order_not_found", "The order was not found.");
    if (order.status === "failed" || order.status === "refunded" || order.status === "reversed") {
      return Response.json({ data: { status: order.status, accessGranted: false } });
    }
    if (!order.moyasar_payment_id) {
      return createApiError(409, "payment_reference_missing", "The payment reference is not available yet.");
    }
    paymentId = order.moyasar_payment_id;
  } else {
    paymentId = body.data.paymentId;
  }

  try {
    const result = await confirmMoyasarPayment(paymentId, {
      kind: "callback", expectedUserId: user.id,
    });
    if (result.orderStatus === "paid") schedulePaymentReceipt(result.orderId);
    return Response.json({ data: {
      status: result.orderStatus,
      accessGranted: result.orderStatus === "paid" && result.enrollmentId !== null,
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PaymentConfirmationError) {
      return createApiError(error.status, error.code, error.message);
    }
    return createApiError(500, "payment_recheck_failed", "The payment could not be rechecked.");
  }
}
