import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { Database } from "@/lib/supabase/database.types";

type MediaStatus = Database["public"]["Enums"]["media_status"];

function decodeHexSignature(signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) {
    return null;
  }

  return Buffer.from(signature, "hex");
}

export function verifyBunnyWebhookSignature(
  rawBody: string | Buffer,
  headers: Headers,
  signingSecret: string,
) {
  if (
    headers.get("x-bunnystream-signature-version") !== "v1" ||
    headers.get("x-bunnystream-signature-algorithm") !== "hmac-sha256"
  ) {
    return false;
  }

  const suppliedSignature = decodeHexSignature(
    headers.get("x-bunnystream-signature") ?? "",
  );

  if (!suppliedSignature) {
    return false;
  }

  const expectedSignature = createHmac("sha256", signingSecret)
    .update(rawBody)
    .digest();

  return (
    suppliedSignature.length === expectedSignature.length &&
    timingSafeEqual(suppliedSignature, expectedSignature)
  );
}

export function mapBunnyStatus(status: number): MediaStatus | null {
  switch (status) {
    case 0:
    case 6:
      return "uploading";
    case 1:
    case 2:
    case 7:
      return "processing";
    case 3:
    case 4:
      return "ready";
    case 5:
    case 8:
      return "failed";
    default:
      return null;
  }
}
