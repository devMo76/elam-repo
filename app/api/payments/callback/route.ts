import { NextResponse } from "next/server";
import { z } from "zod";

import type { PaymentReturnState } from "@/lib/contracts";
import { getPublicEnvironment } from "@/lib/env/public";
import { observeServerRequest } from "@/lib/observability/server";
import {
  confirmMoyasarPayment,
  PaymentConfirmationError,
} from "@/lib/payments/confirmation";
import { schedulePaymentReceipt } from "@/lib/payments/receipt-scheduling";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function createReturnResponse(state: PaymentReturnState) {
  const destination = new URL("/dashboard", getPublicEnvironment().NEXT_PUBLIC_SITE_URL);
  destination.searchParams.set("payment", state);

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function createSignInReturnResponse() {
  const destination = new URL(
    "/auth/sign-in",
    getPublicEnvironment().NEXT_PUBLIC_SITE_URL,
  );
  destination.searchParams.set("next", "/dashboard?payment=sign_in_required");

  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  return observeServerRequest("payments.callback", request.method, async () => {
    const paymentId = z.uuid().safeParse(
      new URL(request.url).searchParams.get("id"),
    );

    if (!paymentId.success) {
      return createReturnResponse("failed");
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return createSignInReturnResponse();
    }

    try {
      const result = await confirmMoyasarPayment(paymentId.data, {
        kind: "callback",
        expectedUserId: user.id,
      });

      if (result.orderStatus === "paid") {
        schedulePaymentReceipt(result.orderId);
        return createReturnResponse("success");
      }

      if (result.orderStatus === "pending") {
        return createReturnResponse("pending");
      }

      return createReturnResponse("failed");
    } catch (error) {
      if (
        error instanceof PaymentConfirmationError &&
        error.code === "payment_provider_unavailable"
      ) {
        return createReturnResponse("pending");
      }

      return createReturnResponse("failed");
    }
  });
}
