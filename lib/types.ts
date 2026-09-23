/**
 * Data contract for Elam.
 *
 * Defined before the UI so screens cannot assume shapes the eventual
 * database is unable to express. Mock data conforms to these types exactly,
 * and the Supabase schema in sub-project 4 is derived from them.
 *
 * Course, Instructor, and Offering stay separate even though the launch UI
 * joins all three into a single tile. The launch model is one instructor per
 * course; keeping the types separable means a second instructor teaching the
 * same course later is a presentation change, not a data migration.
 */

export type Department = "EE";

/** A university course as it appears in the official catalogue. */
export interface Course {
  /** Official course code, e.g. "EE 301". Latin, rendered via <Num>. */
  code: string;
  titleAr: string;
  department: Department;
  credits: number;
}

/** A peer instructor. Curated and manually onboarded at launch. */
export interface Instructor {
  id: string;
  nameAr: string;
  /** Academic year, e.g. 4. Null once graduated. */
  year: number | null;
  /** Provisional vocabulary, e.g. "خريج" or "طالب". */
  standingAr: string;
  termsTaught: number;
}

/** One instructor's course offering. The sellable unit. */
export interface Offering {
  id: string;
  courseCode: Course["code"];
  instructorId: Instructor["id"];
  durationMin: number;
  /**
   * Null means "not priced yet", which is a real state for a course that is
   * built but awaiting a commercial decision. The UI renders a visible
   * placeholder rather than a number, so an unpriced course can never be
   * mistaken for a free one.
   */
  priceSAR: number | null;
  lessonCount: number;
  /** Null when no free preview has been published yet. */
  previewLessonId: string | null;
  /** Null until genuine ratings exist. Never seeded with invented values. */
  rating: number | null;
  ratingCount: number;
}

/** Denormalised view for tiles and cards. Assembled, never stored. */
export interface OfferingCard {
  offering: Offering;
  course: Course;
  instructor: Instructor;
}

/** A chapter within an offering. Grouping is what makes the curriculum read
 *  as a progression rather than a flat list of videos. */
export interface Module {
  id: string;
  offeringId: Offering["id"];
  titleAr: string;
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: Module["id"];
  titleAr: string;
  durationMin: number;
  order: number;
  /** Free preview. At least one per offering is the product promise. */
  isPreview: boolean;
}

/** Assembled view for the course detail page. Never stored in this shape. */
export interface CourseDetail extends OfferingCard {
  modules: Array<Module & { lessons: Lesson[] }>;
}
