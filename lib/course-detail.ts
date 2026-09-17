import type { CourseDetail, Lesson, Module } from "./types";
import { getOfferingCards } from "./mock-data";
import { codeFromSlug } from "./slug";

/**
 * MOCK curriculum. Generated per offering rather than hand-written so every
 * course has a plausible structure, and so the detail page is exercised
 * against varying module and lesson counts instead of one tidy example.
 *
 * Replaced wholesale by Supabase queries in sub-project 4. The shape is what
 * matters here, not the values.
 */
const MODULE_TITLES = [
  "الأساسيات",
  "التحليل",
  "التطبيقات",
  "مسائل الاختبار",
];

const LESSON_TITLES = [
  "مقدمة وتعريفات",
  "القوانين الأساسية",
  "أمثلة محلولة",
  "حالات خاصة",
  "تمارين إضافية",
  "مراجعة سريعة",
];

function buildModules(offeringId: string, lessonCount: number) {
  const moduleCount = Math.min(MODULE_TITLES.length, Math.ceil(lessonCount / 7));
  const perModule = Math.ceil(lessonCount / moduleCount);

  let made = 0;
  return Array.from({ length: moduleCount }, (_, m) => {
    const mod: Module = {
      id: `${offeringId}-m${m + 1}`,
      offeringId,
      titleAr: MODULE_TITLES[m],
      order: m + 1,
    };

    const take = Math.min(perModule, lessonCount - made);
    const lessons: Lesson[] = Array.from({ length: take }, (_, l) => {
      const index = made + l;
      return {
        id: `${mod.id}-l${l + 1}`,
        moduleId: mod.id,
        titleAr: LESSON_TITLES[index % LESSON_TITLES.length],
        // Varies with index so durations are not suspiciously uniform.
        durationMin: 7 + ((index * 3) % 12),
        order: index + 1,
        // Only the opening lesson is free, which is the product promise.
        isPreview: index === 0,
      };
    });
    made += take;

    return { ...mod, lessons };
  });
}

export function getCourseDetail(slug: string): CourseDetail | null {
  const code = codeFromSlug(slug);
  const card = getOfferingCards().find((c) => c.course.code === code);
  if (!card) return null;

  return {
    ...card,
    modules: buildModules(card.offering.id, card.offering.lessonCount),
  };
}
