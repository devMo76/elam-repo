import { HeaderFrame, HeaderNavigation } from "../../../components/HeaderInteractions";
import Link from "next/link";
import { Logo } from "../../../components/ui/Logo";
import { Hero } from "../../../components/sections/Hero";
import { FeaturedCourse } from "../../../components/sections/FeaturedCourse";
import { Catalog } from "../../../components/sections/Catalog";
import { Vetting } from "../../../components/sections/Vetting";
import { Faq } from "../../../components/sections/Faq";
import { PolicyContent } from "../../../components/legal/PolicyContent";
import { SiteFooter } from "../../../components/SiteFooter";
import { AuthPanel } from "../../../components/auth/AuthForm";
import { PolicyAcceptanceDialog } from "../../../components/auth/PolicyAcceptanceDialog";
import { LearnerDashboard } from "../../../components/learning/LearnerDashboard";
import { AdminShell } from "../../../components/admin/AdminShell";
import { AdminCourseReviewContent } from "../../../components/admin/AdminCourseReviewContent";
import { InstructorShell } from "../../../components/instructor/InstructorShell";
import { InstructorCourseEditor } from "../../../components/instructor/InstructorCourseEditor";
import { InstructorNavigationBlockerProvider } from "../../../components/instructor/InstructorNavigationBlocker";
import { InstructorUploadProvider } from "../../../components/instructor/InstructorUploadManager";
import type { StudioCourse } from "../../../components/instructor/studio-types";
import { headerLinks, nav, site } from "../../../lib/copy";
import header from "../../../components/SiteHeader.module.css";

export function PublishingPolishFixture({ course }: { course: StudioCourse }) {
  const view = new URLSearchParams(location.search).get("polish");
  const catalogueCourse = { ...course, department: "الهندسة العامة", visibility: "public" as const, durationSeconds: 120, lessonCount: 2, isEnrolled: false,
    instructor: { id: "20000000-0000-4000-8000-000000000001", fullName: "شارح الهندسة", avatarUrl: null, headline: null, bio: null } };
  const electricalCourse = { ...catalogueCourse, id: "electrical-fixture", slug: "electrical-fixture", title: "دوائر كهربائية", department: "الهندسة الكهربائية", courseCode: "EE301" };
  if (view === "admin") return <AdminShell viewer={{ fullName: "حساب المراجعة" }}>
    <h1>مراجعة الدورات</h1><AdminCourseReviewContent course={course} />
  </AdminShell>;
  if (view === "studio") return <InstructorNavigationBlockerProvider><InstructorUploadProvider>
    <InstructorShell viewer={{ fullName: "حساب الشارح" }}>
      <InstructorCourseEditor course={course} publishingCapability={{ canDirectPublish: false, primaryWorkflow: "review" }} />
    </InstructorShell>
  </InstructorUploadProvider></InstructorNavigationBlockerProvider>;
  return <>
    <HeaderFrame><div className={header.row}>
      <Link href="/" className={header.brand} aria-label={site.name}><Logo className={header.logo} /></Link>
      <HeaderNavigation links={headerLinks} browse={nav.courses}
        desktopAccount={<Link href="/auth/sign-in" className={header.signIn}>تسجيل الدخول</Link>}
        mobileAccount={<Link href="/auth/sign-in" className={header.signIn}>تسجيل الدخول</Link>} />
    </div></HeaderFrame>
    <main id="main-content"><span id="header-sentinel" />
      {view === "auth" ? <div style={{ display: "grid", placeItems: "center", padding: "2rem 1rem" }}><AuthPanel mode="sign-in" /></div>
        : view === "register" ? <div style={{ display: "grid", placeItems: "center", padding: "2rem 1rem" }}><AuthPanel mode="register" /></div>
        : view === "policy-consent" ? <PolicyAcceptanceDialog redirectTo="/studio/courses/existing?tab=content" />
        : view === "policies" ? <PolicyContent />
        : view === "learner" ? <LearnerDashboard fullName="حساب المتعلّم" courses={[]} purchases={[]} paymentState={null} returnPaymentId={null} />
        : <><Hero /><FeaturedCourse courses={[catalogueCourse, electricalCourse, { ...catalogueCourse, id: "third-fixture", slug: "third-fixture", title: "دورة ثالثة" }]} /><Vetting /><Catalog courses={view === "subjects-empty" ? [electricalCourse] : [catalogueCourse, electricalCourse]} /><Faq /></>}
    </main><SiteFooter />
  </>;
}
