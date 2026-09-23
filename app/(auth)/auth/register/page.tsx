import { AuthPanel } from "@/components/auth/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params.next ?? null, "/account");
  await redirectAuthenticatedUser(redirectTo);

  return <AuthPanel mode="register" redirectTo={redirectTo} />;
}
