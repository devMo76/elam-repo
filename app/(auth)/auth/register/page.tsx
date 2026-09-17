import { AuthPanel } from "@/components/auth/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth/guards";

export default async function RegisterPage() {
  await redirectAuthenticatedUser();
  return <AuthPanel mode="register" />;
}
