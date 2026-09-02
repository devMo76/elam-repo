import "server-only";

import { z } from "zod";

const optionalSecretSchema = z.string().trim().min(1).optional();

const serverEnvironmentSchema = z.strictObject({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  MOYASAR_SECRET_KEY: optionalSecretSchema,
  MOYASAR_WEBHOOK_SECRET: optionalSecretSchema,
  BUNNY_STREAM_LIBRARY_ID: optionalSecretSchema,
  BUNNY_STREAM_API_KEY: optionalSecretSchema,
  BUNNY_STREAM_READ_ONLY_API_KEY: optionalSecretSchema,
  BUNNY_STREAM_TOKEN_KEY: optionalSecretSchema,
  EMAIL_API_KEY: optionalSecretSchema,
});

const bunnyStreamEnvironmentSchema = z.strictObject({
  BUNNY_STREAM_LIBRARY_ID: z.string().regex(/^\d+$/),
  BUNNY_STREAM_API_KEY: z.string().trim().min(1),
  BUNNY_STREAM_READ_ONLY_API_KEY: z.string().trim().min(1),
  BUNNY_STREAM_TOKEN_KEY: z.string().trim().min(1),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
export type BunnyStreamEnvironment = z.infer<
  typeof bunnyStreamEnvironmentSchema
>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MOYASAR_SECRET_KEY: process.env.MOYASAR_SECRET_KEY,
    MOYASAR_WEBHOOK_SECRET: process.env.MOYASAR_WEBHOOK_SECRET,
    BUNNY_STREAM_LIBRARY_ID: process.env.BUNNY_STREAM_LIBRARY_ID,
    BUNNY_STREAM_API_KEY: process.env.BUNNY_STREAM_API_KEY,
    BUNNY_STREAM_READ_ONLY_API_KEY: process.env.BUNNY_STREAM_READ_ONLY_API_KEY,
    BUNNY_STREAM_TOKEN_KEY: process.env.BUNNY_STREAM_TOKEN_KEY,
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  });
}

export function getBunnyStreamEnvironment(): BunnyStreamEnvironment {
  const environment = getServerEnvironment();

  return bunnyStreamEnvironmentSchema.parse({
    BUNNY_STREAM_LIBRARY_ID: environment.BUNNY_STREAM_LIBRARY_ID,
    BUNNY_STREAM_API_KEY: environment.BUNNY_STREAM_API_KEY,
    BUNNY_STREAM_READ_ONLY_API_KEY: environment.BUNNY_STREAM_READ_ONLY_API_KEY,
    BUNNY_STREAM_TOKEN_KEY: environment.BUNNY_STREAM_TOKEN_KEY,
  });
}
