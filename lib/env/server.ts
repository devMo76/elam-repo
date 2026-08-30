import "server-only";

import { z } from "zod";

const optionalSecretSchema = z.string().trim().min(1).optional();

const serverEnvironmentSchema = z.strictObject({
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  MOYASAR_SECRET_KEY: optionalSecretSchema,
  MOYASAR_WEBHOOK_SECRET: optionalSecretSchema,
  VIDEO_API_KEY: optionalSecretSchema,
  VIDEO_TOKEN_SIGNING_KEY: optionalSecretSchema,
  EMAIL_API_KEY: optionalSecretSchema,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    VIDEO_API_KEY: process.env.VIDEO_API_KEY,
    VIDEO_TOKEN_SIGNING_KEY: process.env.VIDEO_TOKEN_SIGNING_KEY,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  });
}
