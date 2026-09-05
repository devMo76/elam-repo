import "server-only";

import { z } from "zod";

import { getEmailEnvironment } from "@/lib/env/server";

const resendResponseSchema = z.object({
  id: z.string().trim().min(1),
});

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

type SendEmailInput = {
  idempotencyKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

export class ResendApiError extends Error {
  constructor(public readonly code: string) {
    super("Resend email delivery failed");
    this.name = "ResendApiError";
  }
}

export async function sendEmail(input: SendEmailInput) {
  const environment = getEmailEnvironment();
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.EMAIL_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: environment.EMAIL_FROM_ADDRESS,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new ResendApiError(`resend_http_${response.status}`);
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new ResendApiError("resend_invalid_response");
  }

  const parsedResponse = resendResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    throw new ResendApiError("resend_invalid_response");
  }

  return parsedResponse.data;
}
