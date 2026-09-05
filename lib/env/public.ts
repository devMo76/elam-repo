import { z } from "zod";

const publicEnvironmentSchema = z.strictObject({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .regex(/^pk_(?:test|live)_[A-Za-z0-9]+$/),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export function getPublicEnvironment(): PublicEnvironment {
  return publicEnvironmentSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
