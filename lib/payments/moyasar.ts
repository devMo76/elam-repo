import "server-only";

import { timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { getMoyasarApiEnvironment } from "@/lib/env/server";

const moyasarPaymentStatusSchema = z.enum([
  "initiated",
  "paid",
  "failed",
  "authorized",
  "captured",
  "refunded",
  "voided",
  "verified",
]);

const moyasarPaymentSchema = z.object({
  id: z.uuid(),
  status: moyasarPaymentStatusSchema,
  amount: z.number().int().nonnegative(),
  currency: z.string().trim().length(3),
  metadata: z
    .record(z.string(), z.string())
    .nullish()
    .transform((metadata) => metadata ?? {}),
  source: z
    .object({
      message: z.string().nullable().optional(),
    })
    .nullish(),
});

const rawPaymentSchema = z.record(z.string(), z.json());

export const moyasarWebhookAuthSchema = z.object({
  secret_token: z.string().min(1),
});

export const moyasarWebhookSchema = z.object({
  id: z.uuid(),
  type: z.string().regex(/^payment_[a-z_]{1,48}$/),
  created_at: z.iso.datetime({ offset: true }),
  secret_token: z.string().min(1),
  live: z.boolean(),
  data: z.object({
    id: z.uuid(),
  }),
});

const MOYASAR_API_URL = "https://api.moyasar.com/v1";

export type MoyasarPayment = z.infer<typeof moyasarPaymentSchema>;

export class MoyasarApiError extends Error {
  constructor(
    operation: string,
    public readonly status?: number,
  ) {
    super(`Moyasar API operation failed: ${operation}`);
    this.name = "MoyasarApiError";
  }
}

export function verifyMoyasarWebhookSecret(
  suppliedSecret: string,
  expectedSecret: string,
) {
  const supplied = Buffer.from(suppliedSecret, "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");

  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export function isExpectedMoyasarMode(live: boolean, secretKey: string) {
  return live === secretKey.startsWith("sk_live_");
}

export async function fetchMoyasarPayment(paymentId: string) {
  const environment = getMoyasarApiEnvironment();
  const response = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${environment.MOYASAR_SECRET_KEY}:`,
      ).toString("base64")}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new MoyasarApiError("fetch payment", response.status);
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new MoyasarApiError("fetch payment: invalid JSON response");
  }

  const rawPayment = rawPaymentSchema.safeParse(responseBody);
  const payment = moyasarPaymentSchema.safeParse(responseBody);

  if (!rawPayment.success || !payment.success) {
    throw new MoyasarApiError("fetch payment: invalid response");
  }

  return {
    payment: payment.data,
    rawPayload: rawPayment.data,
  };
}
