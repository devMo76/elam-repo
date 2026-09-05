import { checkoutRequestSchema } from "@/lib/contracts";
import { createApiError, parseJsonBody } from "@/lib/http/api-response";
import { CheckoutError, createCheckout } from "@/lib/payments/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await parseJsonBody(request, checkoutRequestSchema);

  if (!body.success) {
    return body.response;
  }

  try {
    return Response.json(await createCheckout(body.data.courseId));
  } catch (error) {
    if (error instanceof CheckoutError) {
      return createApiError(error.status, error.code, error.message);
    }

    return createApiError(
      500,
      "checkout_failed",
      "Checkout could not be prepared.",
    );
  }
}
