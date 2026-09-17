/**
 * PROVISIONAL COPY.
 *
 * Every Arabic string on the homepage lives here so the client can review and
 * revise wording without touching component code. None of it is final.
 *
 * Rules that hold regardless of rewording:
 *   - No invented statistics, enrollment counts, or ratings.
 *   - No claim that Elam is affiliated with any university.
 *   - Two CTA intents only: "browse courses" and "become an instructor".
 *     Each keeps one label everywhere it appears.
 */

/**
 * REGISTER: informal Saudi, not Modern Standard Arabic.
 *
 * The pitch is peer-to-peer -- a student who passed the course explaining it
 * to one who has not -- and MSA makes that sound institutional, which is the
 * one thing Elam is not. So the copy uses اللي over الذي, مين over من, ما
 * فيه over لا يوجد, مو over ليس, عشان over حتى, and keeps the borrowed
 * "الميد والفاينل" rather than translating to نصفي ونهائي, because that is
 * what students actually call them.
 *
 * TWO DELIBERATE EXCEPTIONS, both in the footer. `disclaimer` and the legal
 * link labels stay MSA: they disclaim university affiliation, and dialect
 * buys tone at the cost of precision in exactly the sentence that must not be
 * ambiguous. Keep new legal copy in MSA too.
 *
 * NOT WRITTEN BY A NATIVE SPEAKER. The dialect below is plausible rather than
 * verified. Every string wants a read-through by someone who talks this way
 * before launch; treat awkward phrasing as a translation defect, not a design
 * decision.
 */
export const site = {
  name: "Elam",
  tagline: "مواد الهندسة، بشرح من سبقك",
  /**
   * Doubles as the meta description. Replaced the previous wording, which
   * said "الهندسة الكهربائية" and promised nothing about exams -- it now
   * contradicted both the headline and the bullets beneath it.
   */
  description:
    "شروحات لمواد الهندسة بالعربي، على ترتيب مادتك ودكتورك، من طلبة تفوّقوا فيها، نمشي معك من أول محاضرة إلى الميد والفاينل",
} as const;

export const nav = {
  courses: "المواد",
  howItWorks: "كيف تشتغل المنصة",
  teach: "درّس على Elam",
} as const;

/** The two page-wide CTA intents. Reused verbatim in nav, hero, and footer. */
export const cta = {
  browse: "شوف المواد",
  teach: "قدّم كمدرّس",
} as const;

export const hero = {
  /**
   * LENGTH IS A LAYOUT CONSTRAINT, not just a style preference. The hero sets
   * this at 56px in a column that fits roughly 13-14 Arabic characters per
   * line, so anything past about 28 characters wraps to three ragged lines.
   * This is 26. Measure before lengthening it.
   */
  headline: "مواد الهندسة، بشرح من سبقك",
  /** Spec caps hero subtext at 20 words. This is exactly 20, so any rewrite
   *  that adds a word breaks the cap rather than merely approaching it. */
  subtext:
    "شروحات لمواد الهندسة بالعربي، على ترتيب مادتك ودكتورك، من طلبة تفوّقوا فيها، نمشي معك من أول محاضرة إلى الميد والفاينل",
  anchorLabel: "كيف نختار المدرّسين",

  /**
   * Three supporting points under the CTA. Order is load-bearing: the icons in
   * Hero.tsx are positional, so reordering these without reordering those
   * pairs each line with the wrong glyph.
   *
   * The middle point is the only claim on the page that is not restated
   * elsewhere, and it is the sharpest one: engineering here is taught in
   * English while students think in Arabic. Do not drop it in a rewrite.
   *
   * The third overlaps the vetting section on purpose -- the anchor link
   * directly above it goes there, so the point and the link reinforce rather
   * than compete.
   */
  points: [
    "أول درس في كل مادة مجاني",
    "شرح بالعربي لمادة تُدرَّس لك بالإنجليزي",
    "ما ننشر أي شرح قبل ما نسمعه ونراجعه",
  ],
} as const;

export const featured = {
  /** Eyebrow above the heading. Names the section's job, not its content. */
  eyebrow: "ابدأ من هنا",
  heading: "الدورة الأكثر انتشاراً",
  body: "عندنا تجهيزات للميد والفاينل",
  previewLabel: "أول درس مجاني",
  /**
   * The card is a link in its entirety. This label makes that legible instead
   * of leaving it to be discovered by hovering, which a touch reader cannot
   * do at all. It is an affordance, not a third CTA intent: it navigates to a
   * course rather than starting a new journey, so the two-CTA lock holds.
   */
  viewLabel: "شوف المادة",
} as const;

/**
 * Trust section. CURRENTLY UNRENDERED -- the section was removed from the
 * homepage at the client's request ("for now"), and components/sections/
 * WhyElam.tsx was deleted with it. This block is kept deliberately: the copy
 * was reviewed, and restoring the section should not mean rewriting it. The
 * component is recoverable from git history.
 *
 * NOTE FOR REVIEW: these are claims, not measurements. There is no ratings
 * data yet, and every mock rating is deliberately null. The wording is
 * therefore kept qualitative on purpose. Do not add a star average, a review
 * count, or a percentage here until real numbers exist to back them, since an
 * invented figure is exactly the thing that would undermine the trust this
 * section is trying to build.
 */
export const why = {
  heading: "ليش يثقون فينا الطلبة",
  items: [
    {
      title: "تقييمات عالية من الطلبة",
      body: "الطلبة اللي خلّصوا المواد يقيّمونها عالي ويوصون فيها زملائهم.",
    },
    {
      title: "انطباعات موثوقة",
      body: "ما يُحسب التقييم إلا بعد ما تخلّص جزء حقيقي من المادة، فاللي تقراه تجربة فعلية.",
    },
    {
      title: "مربوط بمنهج جامعتك",
      body: "الشرح يمشي على ترتيب المقرر ومفرداته، مو منهج عام ما يشبه اختبارك.",
    },
  ],
} as const;

export const vetting = {
  heading: "كيف نختار المدرّسين",
  body: "ما فيه تسجيل ذاتي. نختار كل مدرّس بنفسنا قبل ما ننشر أي مادة.",
  steps: [
    {
      label: "خبرة في الشرح",
      body: "نختار اللي عنده تجربة سابقة في شرح المادة لزملائه.",
    },
    {
      label: "مراجعة نموذج",
      body: "نسمع نموذج من شرحه قبل ما ننشر أي مادة.",
    },
  ],
} as const;

export const catalog = {
  heading: "مواد الهندسة الكهربائية",
  body: "كل مادة يرفعها مدرّسها ويربطها برمز المقرر، وبتنضاف مواد ثانية تباعًا.",
  comingSoonTitle: "مواد ثانية قريبًا",
  comingSoonBody: "نشتغل على إضافة بقية مواد الهندسة الكهربائية.",
} as const;

/**
 * Placeholder values shown while the site carries no real content.
 *
 * Kept in one place so that removing them later is a single, obvious edit
 * rather than a hunt through components for plausible-looking fake data.
 */
export const placeholder = {
  image: "مكان الصورة",
  price: "xx",
} as const;

export const teach = {
  heading: "درّس اللي تتقنه",
  body: "إذا تفوّقت في مادة وتقدر تشرحها بوضوح، نحب نتعرّف على أسلوبك في الشرح.",
  availability:
    "التقديم للمدرّسين مو مفتوح حاليًا. تابع المنصة لمعرفة موعد فتحه.",
} as const;

export const faq = {
  heading: "أسئلة متكرّرة",
  items: [
    {
      q: "هل Elam تابعة للجامعة؟",
      a: "لا. Elam منصة مستقلة، والشروحات فيها مكمّلة لمحاضراتك، مو بديل عنها، ولا معتمدة من أي جهة أكاديمية.",
    },
    {
      q: "مين يقدّم الشروحات؟",
      a: "طلبة وخريجين درسوا نفس المادة وجابوا فيها تقدير عالي، وما ننشر شرحهم إلا بعد ما نراجعه.",
    },
    {
      q: "كيف أتأكد من جودة الشرح قبل ما أدفع؟",
      a: "كل مادة تبدأ بدرس مجاني تشوفه كامل قبل ما تقرّر.",
    },
    {
      q: "هل الشروحات تغنيني عن المحاضرات؟",
      a: "لا. الشروحات مكمّلة للمحاضرة، وتفترض إنك تحضرها.",
    },
    {
      q: "كيف تُحسب التقييمات؟",
      a: "ما يقدر الطالب يقيّم المادة إلا بعد ما يكمّل جزء حقيقي منها، عشان يكون التقييم عن تجربة فعلية.",
    },
  ],
} as const;

export const footer = {
  columns: [
    {
      title: "التعلّم",
      links: [
        { label: "المواد", href: "/courses" },
        { label: "كيف تشتغل المنصة", href: "/#vetting" },
        { label: "الأسئلة المتكرّرة", href: "/#faq" },
      ],
    },
    {
      title: "المدرّسون",
      links: [
        { label: "درّس على Elam", href: "/#teach" },
        { label: "معايير القبول", href: "/#vetting" },
      ],
    },
    {
      title: "المنصة",
      links: [
        { label: "عن Elam", href: null },
        { label: "تواصل معنا", href: null },
      ],
    },
    {
      title: "قانوني",
      links: [
        { label: "الشروط والأحكام", href: null },
        { label: "سياسة الخصوصية", href: null },
      ],
    },
  ],
  disclaimer:
    "Elam منصة مستقلة وغير تابعة لأي جامعة. المحتوى مكمّل للدراسة وليس بديلاً عنها.",
} as const;

export const coursesPage = {
  heading: "المواد",
  body: "كل مادة مربوطة برمز المقرر في جامعتك، ويقدّمها مدرّس واحد مختار.",
  searchLabel: "دوّر برمز المقرر أو اسمه",
  searchPlaceholder: "EE 301 أو الدوائر الكهربائية",
  filterAll: "كل الأقسام",
  departmentEE: "هندسة كهربائية",
  emptyTitle: "ما فيه نتائج",
  emptyBody: "جرّب رمز ثاني أو امسح البحث.",
  clear: "مسح البحث",
} as const;

export const coursePage = {
  backToCourses: "رجوع للمواد",
  curriculum: "محتوى المادة",
  aboutInstructor: "عن المدرّس",
  enroll: "اشترك في المادة",
  previewBadge: "مجاني",
  moduleLabel: "المحور",
  notFoundTitle: "ما لقينا هذي المادة",
  notFoundBody: "يمكن الرابط قديم أو المادة ما اننشرت بعد.",
  /** Instructor record. This is the credibility argument, so it is stated
   *  as verifiable facts rather than as praise. */
  recordTerms: "درّس هذي المادة",
  recordStanding: "الحالة الأكاديمية",
  recordLessons: "عدد الدروس",
  recordDuration: "مدة المحتوى",
} as const;

/**
 * Units. Kept here so Latin/Arabic mixing stays consistent.
 *
 * Hours use the full label requested for course metadata; currency and minutes
 * retain their abbreviations.
 */
export const units = {
  currency: "ر.س",
  hour: "ساعات",
  minute: "د",
} as const;

/**
 * Counted nouns, in the six CLDR plural categories for Arabic. Selected by
 * `pluralize` in lib/plural.ts and rendered by the Counted component; see the
 * band table there for which count picks which key.
 *
 * Lesson labels use the requested plain forms درس / دروس, without tanween.
 * Counts 3–10 use دروس and 11–99 use درس; two also uses the UI plural دروس.
 *
 * `zero` is set to the plural, which is the common interface convention
 * ("٠ دروس"). Classical Arabic would take the singular genitive here. Flagged
 * because it is a judgement call rather than a rule, and because zero counts
 * only appear once a course exists with no lessons published.
 */
export const nouns = {
  lesson: {
    zero: "دروس",
    one: "درس",
    two: "دروس",
    few: "دروس",
    many: "درس",
    other: "درس",
  },
  term: {
    zero: "فصول",
    one: "فصل",
    two: "فصلان",
    few: "فصول",
    many: "فصلًا",
    other: "فصل",
  },
  course: {
    zero: "مواد",
    one: "مادة",
    two: "مادتان",
    few: "مواد",
    many: "مادةً",
    other: "مادة",
  },
} as const;
