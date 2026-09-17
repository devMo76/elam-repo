import Link from "next/link";
import { nav, cta, site } from "@/lib/copy";
import { getRoleHomePath, getViewer } from "@/lib/auth/viewer";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Logo } from "@/components/ui/Logo";
import { HeaderFrame, HeaderNavigation } from "./HeaderInteractions";
import styles from "./SiteHeader.module.css";

const roleLabel = {
  learner: "لوحتي",
  instructor: "استوديوي",
  admin: "الإدارة",
};

export async function SiteHeader() {
  const viewer = await getViewer();
  const desktopAccount = viewer === null ? (
    <Link href="/auth/sign-in" className={styles.signIn}>
      تسجيل الدخول
    </Link>
  ) : (
    <div className={styles.accountControls}>
      <Link href={getRoleHomePath(viewer.role)} className={styles.accountLink}>
        {roleLabel[viewer.role]}
      </Link>
      <SignOutButton />
    </div>
  );
  const mobileAccount = viewer === null ? (
    <Link href="/auth/sign-in" className={styles.signIn}>
      تسجيل الدخول
    </Link>
  ) : (
    <div className={styles.accountControls}>
      <Link href={getRoleHomePath(viewer.role)} className={styles.accountLink}>
        {roleLabel[viewer.role]}
      </Link>
      <SignOutButton />
    </div>
  );

  return (
    <HeaderFrame>
      <div className={styles.row}>
        <Link href="/" aria-label={site.name} className={styles.brand}>
          <Logo className={styles.logo} />
        </Link>
        <HeaderNavigation
          links={[
            { href: "/courses", label: nav.courses },
            { href: "#vetting", label: nav.howItWorks },
            { href: "#teach", label: nav.teach },
          ]}
          browse={cta.browse}
          desktopAccount={desktopAccount}
          mobileAccount={mobileAccount}
        />
      </div>
    </HeaderFrame>
  );
}
