import {
  authoringCourseSchema,
  authoringModuleSchema,
} from "@/lib/contracts";

type RawModule = {
  id: string;
  course_id: string;
  title: string;
  position: number;
};

type RawCourse = {
  id: string;
  slug: string;
  department: string;
  course_code: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_halalas: number;
  currency: string;
  status: "draft" | "in_review" | "published" | "archived";
  cover_url: string | null;
  created_at: string;
  published_at: string | null;
  modules?: RawModule[] | null;
};

export function toAuthoringModule(rawModule: RawModule) {
  return authoringModuleSchema.parse({
    id: rawModule.id,
    courseId: rawModule.course_id,
    title: rawModule.title,
    position: rawModule.position,
  });
}

export function toAuthoringCourse(course: RawCourse) {
  return authoringCourseSchema.parse({
    id: course.id,
    slug: course.slug,
    department: course.department,
    courseCode: course.course_code,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    priceHalalas: course.price_halalas,
    currency: course.currency,
    status: course.status,
    coverUrl: course.cover_url,
    createdAt: course.created_at,
    publishedAt: course.published_at,
    modules: [...(course.modules ?? [])]
      .sort((left, right) => left.position - right.position)
      .map(toAuthoringModule),
  });
}
