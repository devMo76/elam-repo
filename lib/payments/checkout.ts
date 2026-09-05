import "server-only";

import { checkoutResponseSchema } from "@/lib/contracts";
import { getPublicEnvironment } from "@/lib/env/public";
import { getMoyasarApiEnvironment } from "@/lib/env/server";
import { isExpectedMoyasarMode } from "@/lib/payments/moyasar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export class CheckoutError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export async function createCheckout(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new CheckoutError(401, "unauthenticated", "Sign-in is required.");
  }

  if (!user.email_confirmed_at) {
    throw new CheckoutError(
      403,
      "email_verification_required",
      "Verify your email before purchasing a course.",
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new CheckoutError(
      500,
      "checkout_failed",
      "Checkout could not be prepared.",
    );
  }

  if (profile?.role !== "learner") {
    throw new CheckoutError(
      403,
      "learner_required",
      "A learner account is required to purchase a course.",
    );
  }

  const publicEnvironment = getPublicEnvironment();
  const apiEnvironment = getMoyasarApiEnvironment();
  const publishableKey =
    publicEnvironment.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;

  if (
    !isExpectedMoyasarMode(
      publishableKey.startsWith("pk_live_"),
      apiEnvironment.MOYASAR_SECRET_KEY,
    )
  ) {
    throw new CheckoutError(
      500,
      "payment_configuration_invalid",
      "Checkout is temporarily unavailable.",
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_pending_order", {
    target_user: user.id,
    target_course: courseId,
  });

  if (error) {
    if (error.code === "P0002") {
      throw new CheckoutError(
        404,
        "course_not_available",
        "The course is not available for purchase.",
      );
    }

    if (error.code === "23505") {
      throw new CheckoutError(
        409,
        "already_enrolled",
        "You already have access to this course.",
      );
    }

    throw new CheckoutError(
      500,
      "checkout_failed",
      "Checkout could not be prepared.",
    );
  }

  const order = data[0];

  if (!order || order.order_status !== "pending") {
    throw new CheckoutError(
      500,
      "checkout_failed",
      "Checkout could not be prepared.",
    );
  }

  const callbackUrl = new URL(
    "/api/payments/callback",
    publicEnvironment.NEXT_PUBLIC_SITE_URL,
  );

  return checkoutResponseSchema.parse({
    data: {
      orderId: order.order_id,
      amount: order.amount_halalas,
      currency: order.currency,
      description: `Elam course order ${order.order_id}`,
      publishableApiKey: publishableKey,
      callbackUrl: callbackUrl.toString(),
      metadata: {
        order_id: order.order_id,
      },
    },
  });
}
