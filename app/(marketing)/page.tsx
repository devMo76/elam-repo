import { Hero } from "@/components/sections/Hero";
import { FeaturedCourse } from "@/components/sections/FeaturedCourse";
import { Vetting } from "@/components/sections/Vetting";
import { Catalog } from "@/components/sections/Catalog";
import { Faq } from "@/components/sections/Faq";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { PublicShell } from "@/components/marketing/PublicShell";
import { listPublishedCourseDetails } from "@/lib/catalogue/queries";
import styles from "@/components/sections/Landing.module.css";

/**
 * Five sections: split hero, featured card, vetting, catalogue, and a closing
 * section combining FAQs with the teaching invitation.
 *
 * The bento section (WhyElam) that sat third was removed at the client's
 * request. Its copy is kept in lib/copy.ts under `why` so restoring it does
 * not mean rewriting reviewed content; the component itself is recoverable
 * from git history. Note that it was the page's only bento layout and the
 * home of both remaining image slots, so the page is now entirely
 * photography-free below the hero.
 *
 * Server Component. Only Reveal and its children cross into the client.
 * Header and footer live in the root layout so every route shares them.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; auth_error?: string }>;
}) {
  const [params, courses] = await Promise.all([
    searchParams,
    listPublishedCourseDetails(),
  ]);
  const authStatus = params.auth === "verified"
    ? "verified"
    : params.auth_error === "confirmation_failed"
      ? "confirmation-failed"
      : null;

  return (
    <PublicShell>
      {authStatus ? <AuthStatus status={authStatus} /> : null}
      <div className={styles.home}>
        <Hero />
        <FeaturedCourse
          course={courses.find((course) => course.priceHalalas === 0) ?? courses[0]}
        />
        <Vetting />
        <Catalog courses={courses} />
        <Faq />
      </div>
    </PublicShell>
  );
}
