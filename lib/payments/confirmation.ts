import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMoyasarPayment, MoyasarApiError } from "@/lib/payments/moyasar";
import { attemptPaymentReceipt } from "@/lib/payments/receipt";

const orderIdSchema = z.uuid();

type ConfirmationSource =
  | {
      kind: "callback";
      expectedUserId: string;
    }
  | {
      kind: "webhook";
      eventId: string;
      eventType: string;
    };

export class PaymentConfirmationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentConfirmationError";
  }
}

function getFailureReason(
  status: string,
  sourceMessage: string | null | undefined,
) {
  if (status !== "failed") {
    return "";
  }

  return sourceMessage?.trim() || "Payment provider reported failure";
}

export async function confirmMoyasarPayment(
  paymentId: string,
  source: ConfirmationSource,
) {
  let verified;

  try {
    verified = await fetchMoyasarPayment(paymentId);
  } catch (error) {
    if (error instanceof MoyasarApiError) {
      throw new PaymentConfirmationError(
        502,
        "payment_provider_unavailable",
        "The payment could not be verified right now.",
      );
    }

    throw error;
  }

  const orderId = orderIdSchema.safeParse(verified.payment.metadata.order_id);

  if (!orderId.success) {
    throw new PaymentConfirmationError(
      422,
      "payment_metadata_invalid",
      "The payment is not linked to a valid order.",
    );
  }

  const admin = createAdminClient();

  if (source.kind === "callback") {
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("user_id")
      .eq("id", orderId.data)
      .maybeSingle();

    if (orderError) {
      throw new PaymentConfirmationError(
        500,
        "payment_confirmation_failed",
        "The payment could not be confirmed.",
      );
    }

    if (!order || order.user_id !== source.expectedUserId) {
      throw new PaymentConfirmationError(
        404,
        "payment_not_found",
        "The payment could not be found.",
      );
    }
  }

  const eventId =
    source.kind === "webhook"
      ? source.eventId
      : `callback:${verified.payment.id}:${verified.payment.status}`;
  const eventType =
    source.kind === "webhook" ? source.eventType : "payment_callback";
  const providerStatus =
    source.kind === "webhook" &&
    source.eventType === "payment_abandoned" &&
    verified.payment.status === "initiated"
      ? "failed"
      : verified.payment.status;
  const paymentWasAbandoned =
    source.kind === "webhook" &&
    source.eventType === "payment_abandoned" &&
    providerStatus === "failed";

  const { data, error } = await admin.rpc("process_verified_moyasar_payment", {
    target_order: orderId.data,
    provider_event_id: eventId,
    provider_payment_id: verified.payment.id,
    event_type: eventType,
    provider_status: providerStatus,
    provider_amount: verified.payment.amount,
    provider_currency: verified.payment.currency,
    provider_order_id: orderId.data,
    provider_payload: verified.rawPayload,
    failure_detail:
      paymentWasAbandoned
        ? "Payment was abandoned"
        : getFailureReason(
            verified.payment.status,
            verified.payment.source?.message,
          ),
  });

  if (error) {
    const clientError = ["22023", "23505", "23514", "P0002"].includes(
      error.code,
    );

    throw new PaymentConfirmationError(
      clientError ? 422 : 500,
      clientError ? "payment_verification_failed" : "payment_confirmation_failed",
      clientError
        ? "The verified payment did not match the order."
        : "The payment could not be confirmed.",
    );
  }

  const result = data[0];

  if (!result) {
    throw new PaymentConfirmationError(
      500,
      "payment_confirmation_failed",
      "The payment could not be confirmed.",
    );
  }

  if (result.order_status === "paid") {
    await attemptPaymentReceipt(orderId.data);
  }

  return {
    orderId: orderId.data,
    orderStatus: result.order_status,
    enrollmentId: result.enrollment_id,
    stateChanged: result.state_changed,
  };
}
