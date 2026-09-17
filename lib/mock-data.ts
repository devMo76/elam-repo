/**
 * PLACEHOLDER DATA. Not real inventory or real pricing.
 *
 * Conforms exactly to lib/types.ts so that swapping this module for Supabase
 * queries in sub-project 4 is a data-source change and nothing else.
 *
 * WHAT IS REAL AND WHAT IS NOT
 *
 * Real: the two named instructors, supplied by the client.
 * Not real, and must be checked before launch:
 *   - Every course code and title. See the note on `courses` below.
 *   - Every price. See the note on `offerings`.
 *   - The standing and terms-taught figures attached to the named
 *     instructors. Only their names were supplied; the rest is filler and
 *     should be confirmed with them rather than published as stated.
 *
 * Ratings are null and ratingCount is 0 throughout, and that is not a gap to
 * be filled in later. The product only permits rating after genuine progress,
 * so null is the real launch state and every screen must read well without
 * one. Seeding a rating to make the UI look finished would fabricate exactly
 * the social proof the trust section is trying to earn honestly.
 */

import type { Course, Instructor, Offering, OfferingCard } from "./types";

/**
 * COURSE CODES ARE PROVISIONAL AND UNVERIFIED.
 *
 * They follow the shape of a Saudi engineering catalogue but were not checked
 * against any university's published course list, so treat every code and
 * title here as a placeholder that happens to look plausible.
 *
 * This matters more than usual. The entire proposition is "مربوط بمنهج
 * جامعتك" -- matched to your syllabus -- so a code that does not resolve to a
 * real course actively undercuts the pitch to the one reader best placed to
 * notice. Replace this list with the real catalogue before launch.
 *
 * Courses exist here only because an instructor uploaded one. There is no
 * "course awaiting an instructor" state: the instructor is who creates the
 * course record, entering its code as part of the upload. That is why every
 * entry below has a matching offering, and why nothing models an unclaimed
 * course.
 */
export const courses: Course[] = [
  { code: "EE 201", titleAr: "الدوائر الكهربائية 1", department: "EE", credits: 4 },
  { code: "EE 202", titleAr: "الدوائر الكهربائية 2", department: "EE", credits: 4 },
  { code: "EE 251", titleAr: "تصميم الدوائر المنطقية", department: "EE", credits: 3 },
  { code: "EE 301", titleAr: "الإلكترونيات 1", department: "EE", credits: 4 },
  { code: "EE 311", titleAr: "الإشارات والأنظمة", department: "EE", credits: 3 },
  { code: "EE 340", titleAr: "المجالات الكهرومغناطيسية", department: "EE", credits: 3 },
];

/**
 * Two named instructors supplied by the client, plus two openly labelled
 * placeholders.
 *
 * The placeholders keep their "تجريبي" naming deliberately. A fourth and
 * fifth plausible Saudi name would make the roster look staffed when it is
 * not, and there would then be no way to tell, from the data alone, which
 * people actually exist.
 *
 * standingAr and termsTaught on the two real names are filler. Do not present
 * them as fact.
 */
export const instructors: Instructor[] = [
  {
    id: "i1",
    nameAr: "محمد الجعيدان",
    year: null,
    standingAr: "خريج",
    termsTaught: 4,
  },
  {
    id: "i2",
    nameAr: "عبدالعزيز اسامة",
    year: 4,
    standingAr: "طالب سنة رابعة",
    termsTaught: 2,
  },
  {
    id: "i3",
    nameAr: "مدرب تجريبي 1",
    year: null,
    standingAr: "خريج",
    termsTaught: 1,
  },
  {
    id: "i4",
    nameAr: "مدرب تجريبي 2",
    year: 5,
    standingAr: "طالب سنة خامسة",
    termsTaught: 1,
  },
];

/**
 * PRICES ARE PROVISIONAL. They sit in the band typical of Arabic online course
 * content and were chosen to exercise the UI, not decided commercially.
 *
 * Every offering carries a preview lesson, because "each course opens with a
 * free lesson" is stated as a promise in the FAQ and in the hero. An offering
 * with previewLessonId null is still a legal state the components handle, but
 * shipping one would contradict copy the reader has already been shown.
 */
export const offerings: Offering[] = [
  {
    id: "o1",
    courseCode: "EE 201",
    instructorId: "i1",
    durationMin: 360,
    priceSAR: 179,
    lessonCount: 24,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
  {
    id: "o2",
    courseCode: "EE 202",
    instructorId: "i1",
    durationMin: 310,
    priceSAR: 179,
    lessonCount: 20,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
  {
    id: "o3",
    courseCode: "EE 251",
    instructorId: "i2",
    durationMin: 330,
    priceSAR: 149,
    lessonCount: 22,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
  {
    id: "o4",
    courseCode: "EE 301",
    instructorId: "i2",
    durationMin: 420,
    priceSAR: 199,
    lessonCount: 26,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
  {
    id: "o5",
    courseCode: "EE 311",
    instructorId: "i3",
    durationMin: 280,
    priceSAR: 159,
    lessonCount: 18,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
  {
    id: "o6",
    courseCode: "EE 340",
    instructorId: "i4",
    durationMin: 240,
    priceSAR: 149,
    lessonCount: 16,
    previewLessonId: "l1",
    rating: null,
    ratingCount: 0,
  },
];

/**
 * Joins the three entities into the denormalised shape the tiles consume.
 * Mirrors the join the database will perform later.
 */
export function getOfferingCards(): OfferingCard[] {
  return offerings.flatMap((offering) => {
    const course = courses.find((c) => c.code === offering.courseCode);
    const instructor = instructors.find((i) => i.id === offering.instructorId);
    // A dangling reference is a data defect, not something to render around.
    if (!course || !instructor) return [];
    return [{ offering, course, instructor }];
  });
}

export function getFeaturedCard(): OfferingCard | undefined {
  return getOfferingCards()[0];
}
