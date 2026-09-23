import { timingSafeEqual } from "node:crypto";

import { getPaymentReceiptWorkerEnvironment } from "@/lib/env/server";
import { createApiError } from "@/lib/http/api-response";
import { processPendingPaymentReceipts } from "@/lib/payments/receipt";

export const runtime = "nodejs";

function hasValidWorkerSecret(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization");
  const suppliedSecret = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);

  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function POST(request: Request) {
  const environment = getPaymentReceiptWorkerEnvironment();

  if (
    !hasValidWorkerSecret(
      request,
      environment.PAYMENT_RECEIPT_WORKER_SECRET,
    )
  ) {
    return createApiError(
      401,
      "receipt_worker_unauthorized",
      "The receipt worker credentials are invalid.",
    );
  }

  try {
    const summary = await processPendingPaymentReceipts();
    return Response.json({ data: summary });
  } catch {
    return createApiError(
      503,
      "receipt_worker_unavailable",
      "The receipt queue could not be processed.",
    );
  }
}
