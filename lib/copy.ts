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
  name: "إلام",
  tagline: "دورات الهندسة، بشرح من سبقك",
  /**
   * Doubles as the meta description. Replaced the previous wording, which
   * said "الهندسة الكهربائية" and promised nothing about exams -- it now
   * contradicted both the headline and the bullets beneath it.
   */
  description:
    "شروحات لدورات الهندسة بالعربي، على ترتيب دورتك ودكتورك، من طلبة تفوّقوا فيها، نمشي معك من أول محاضرة إلى الميد والفاينل",
} as const;

export const nav = {
  courses: "الدورات",
  howItWorks: "كيف نعمل في المنصة",
  teach: "اشرح مع إلام",
} as const;

/** Primary navigation omits the duplicate course item; browsing remains a CTA. */
export const headerLinks = [
  { href: "#vetting", label: nav.howItWorks },
  { href: "#teach", label: nav.teach },
] as const;

/** The two page-wide CTA intents. Reused verbatim in nav, hero, and footer. */
export const cta = {
  browse: "الدورات",
  teach: "سجل كشارح",
} as const;

export const hero = {
  // The longer introduction uses a smaller headline; benefits precede actions.
  headline: "في إلام، دوراتنا تشرح لك المواد الصعبة بطريقة سهلة",
  subtext: "ونهدف لحصول مشتركينا على أعلى الدرجات، ودوراتنا تتميز بـ:",
  anchorLabel: "كيف نختار الشارحين",
  // User-approved subject wording is intentional here (wave 2).
  points: [
    "أول درس في كل مادة مجاني",
    "شرح سهل الاستيعاب",
    "شرح باللغة العربية",
  ],
} as const;

export const featured = {
  heading: "أحدث الدورات",
  previewLabel: "أول درس مجاني",
  /**
   * The card is a link in its entirety. This label makes that legible instead
   * of leaving it to be discovered by hovering, which a touch reader cannot
   * do at all. It is an affordance, not a third CTA intent: it navigates to a
   * course rather than starting a new journey, so the two-CTA lock holds.
   */
  viewLabel: "اطلع على الدورة",
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
      body: "الطلبة اللي خلّصوا الدورات يقيّمونها عالي ويوصون فيها زملائهم.",
    },
    {
      title: "انطباعات موثوقة",
      body: "ما يُحسب التقييم إلا بعد ما تخلّص جزء حقيقي من الدورة، فاللي تقراه تجربة فعلية.",
    },
    {
      title: "مربوط بمنهج جامعتك",
      body: "الشرح يمشي على ترتيب المقرر ومفرداته، مو منهج عام ما يشبه اختبارك.",
    },
  ],
} as const;

export const vetting = {
  heading: "بماذا يتميز الشارحون في إلام؟",
  points: [
    "كل شارح في إلام خاض نفس التجربة التي تمر بها ويقدم لك خلاصة ما تحتاجه بدون زيادة",
    "نجهزك للميد والفاينل بأسهل وأسرع طريق",
  ],
} as const;

export const catalog = {
  heading: "مواد الهندسة العامة",
  empty: "لا توجد دورات منشورة في هذا القسم حاليًا.",
  browseAll: "عرض جميع الدورات",
  comingSoonTitle: "دورات ثانية قريبًا",
  comingSoonBody: "نشتغل على إضافة المزيد من دورات الهندسة العامة والرياضيات.",
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
  heading: "كن شارحاً معنا",
  body: "هل تملك المعرفة والقدرة على إيصال المعلومة؟\nنعم، إذاً مكانك معنا في إلام",
  availability:
    "التقديم للشارحين مو مفتوح حاليًا. تابع المنصة لمعرفة موعد فتحه.",
} as const;

export const faq = {
  heading: "أسئلة متكرّرة",
  items: [
    {
      q: "هل إلام تابعة للجامعة؟",
      a: "لا. إلام منصة مستقلة.",
    },
    {
      q: "مين يقدّم الشروحات؟",
      a: "مجموعة متنوعة من الخريجين والطلبة المتميزين الذين لديهم الخبرة في المادة.",
    },
    {
      q: "كيف أتأكد من جودة الشرح؟",
      a: "كل مادة تبدأ بدرس مجاني تستطيع مشاهدته قبل الاشتراك في الدورة.",
    },
  ],
} as const;

export const footer = {
  columns: [
    {
      title: "التعلّم",
      links: [
        { label: "الدورات", href: "/courses" },
        { label: "كيف نعمل في المنصة", href: "/#vetting" },
        { label: "الأسئلة المتكرّرة", href: "/#faq" },
      ],
    },
    {
      title: "الشارحون",
      links: [
        { label: "اشرح مع إلام", href: "/#teach" },
      ],
    },
    {
      title: "تواصل معنا",
      links: [
        { label: "elam.support@gmail.com", href: "mailto:elam.support@gmail.com", direction: "ltr" },
        { label: "+966 55 133 5720", href: "tel:+966551335720", direction: "ltr" },
      ],
    },
    {
      title: "قانوني",
      links: [
        { label: "لائحة سياسات الخصوصية والاستخدام", href: "/policies" },
      ],
    },
  ],
  disclaimer:
    "إلام منصة مستقلة ومحتوى دوراتها يساعدك على فهم مقرراتك الجامعية وليس بديلا عنها",
} as const;

export const coursesPage = {
  heading: "الدورات",
  body: "كل دورة مربوطة برمز المقرر في جامعتك، ويقدّمها شارح واحد مختار.",
  searchLabel: "دوّر برمز المقرر أو اسمه",
  searchPlaceholder: "EE 301 أو الدوائر الكهربائية",
  filterAll: "كل الأقسام",
  departmentEE: "هندسة كهربائية",
  emptyTitle: "ما فيه نتائج",
  emptyBody: "جرّب رمز ثاني أو امسح البحث.",
  clear: "مسح البحث",
} as const;

export const coursePage = {
  backToCourses: "رجوع للدورات",
  curriculum: "محتوى الدورة",
  aboutInstructor: "عن الشارح",
  enroll: "اشترك في الدورة",
  previewBadge: "مجاني",
  moduleLabel: "المحور",
  notFoundTitle: "ما لقينا هذي الدورة",
  notFoundBody: "يمكن الرابط قديم أو الدورة ما اننشرت بعد.",
  /** Instructor record. This is the credibility argument, so it is stated
   *  as verifiable facts rather than as praise. */
  recordTerms: "درّس هذي الدورة",
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
    zero: "دورات",
    one: "دورة",
    two: "دورتان",
    few: "دورات",
    many: "دورةً",
    other: "دورة",
  },
} as const;
