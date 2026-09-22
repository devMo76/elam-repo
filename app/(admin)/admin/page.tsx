import { PublicShell } from "@/components/marketing/PublicShell";
import { requireRole } from "@/lib/auth/guards";

export { default } from "@/components/admin/AdminDashboard";

export async function LegacyAdminPage() {
  const viewer = await requireRole("/admin", "admin");
  if (viewer.role === "admin") {
    return (
      <PublicShell>
        <div className="roleLanding">
          <p
            className="mb-4 inline-flex rounded-full bg-tint px-4 py-2 text-sm font-semibold text-accent"
            role="status"
          >
            حساب مسؤول تجريبي
          </p>
          <h1>مرحبًا، {viewer.fullName}</h1>
          <p>
            أنت مسجّل الدخول بصفة مسؤول. لديك صلاحية الوصول إلى أدوات إدارة
            المنصة، ومراجعة المواد، وإدارة المستخدمين.
          </p>
        </div>
      </PublicShell>
    );
  }
  return <PublicShell><div className="roleLanding"><h1>مرحبًا {viewer.fullName}</h1><p>ستظهر هنا ملخصات إدارة المنصة ومراجعة المواد.</p></div></PublicShell>;
}
