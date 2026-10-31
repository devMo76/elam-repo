import { AuthPanel } from "@/components/auth/AuthForm";

export default async function PasswordResetPage({ searchParams }: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const params = await searchParams;
  return <AuthPanel mode="password-reset" initialError={
    params.auth_error === "recovery_failed"
      ? "تعذر استخدام رابط استعادة كلمة المرور. ربما انتهت صلاحيته أو استُخدم سابقًا. اطلب رابطًا جديدًا من هنا."
      : null
  } />;
}
