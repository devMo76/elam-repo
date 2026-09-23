import { AuthPanel } from "@/components/auth/AuthForm";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; password?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = getSafeRedirectPath(params.next ?? null, "/account");
  await redirectAuthenticatedUser(redirectTo);

  return <>{params.password === "updated" ? <AuthStatus status="password-updated" /> : null}<AuthPanel mode="sign-in" redirectTo={redirectTo} /></>;
}
