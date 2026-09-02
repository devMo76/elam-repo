import "server-only";

import { notFound } from "next/navigation";

import { courseSlugSchema } from "@/lib/contracts/catalogue";
import {
  parseRawCatalogueCourse,
  parseRawCatalogueCourseSummary,
  toCatalogueCourseDetail,
  toCatalogueCourseSummary,
} from "@/lib/catalogue/transform";
import { createClient } from "@/lib/supabase/server";

const catalogueCourseBaseSelect = `
  id,
  slug,
  department,
  course_code,
  title,
  subtitle,
  price_halalas,
  currency,
  cover_url,
  instructor:profiles!courses_instructor_id_fkey (
    id,
    full_name,
    avatar_url,
    headline,
    bio
  )
`;

const catalogueCourseSummarySelect = `
  ${catalogueCourseBaseSelect},
  modules (
    lessons (
      duration_seconds
    )
  )
`;

const catalogueCourseDetailSelect = `
  ${catalogueCourseBaseSelect},
  description,
  status,
  modules (
    id,
    title,
    position,
    lessons (
      id,
      title,
      position,
      duration_seconds,
      is_free_preview
    )
  )
`;

type Viewer = {
  id: string;
  role: "learner" | "instructor" | "admin";
} | null;

export class CatalogueDataError extends Error {
  constructor(operation: string, options?: ErrorOptions) {
    super(`Catalogue data operation failed: ${operation}`, options);
    this.name = "CatalogueDataError";
  }
}

async function getViewer(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Viewer> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    throw new CatalogueDataError("resolve viewer");
  }

  return { id: user.id, role: profile.role };
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function getEnrolledCourseIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewer: Viewer,
  courseIds: string[],
) {
  if (!viewer || courseIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", viewer.id)
    .in("course_id", courseIds)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) {
    throw new CatalogueDataError("resolve enrolment state");
  }

  return new Set(data.map((enrollment) => enrollment.course_id));
}

export async function listPublishedCourses() {
  const supabase = await createClient();
  const viewerIdPromise = getAuthenticatedUserId(supabase);
  const coursesPromise = supabase
    .from("courses")
    .select(catalogueCourseSummarySelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("slug", { ascending: true });

  const [viewerId, coursesResult] = await Promise.all([
    viewerIdPromise,
    coursesPromise,
  ]);

  if (coursesResult.error) {
    throw new CatalogueDataError("list published courses");
  }

  const courses = coursesResult.data.map(parseRawCatalogueCourseSummary);
  const viewer: Viewer = viewerId
    ? { id: viewerId, role: "learner" }
    : null;
  const enrolledCourseIds = await getEnrolledCourseIds(
    supabase,
    viewer,
    courses.map((course) => course.id),
  );

  return courses.map((course) =>
    toCatalogueCourseSummary(course, enrolledCourseIds.has(course.id)),
  );
}

export async function getCatalogueCourseBySlug(slug: string) {
  const parsedSlug = courseSlugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    return null;
  }

  const supabase = await createClient();
  const viewer = await getViewer(supabase);
  let query = supabase
    .from("courses")
    .select(catalogueCourseDetailSelect)
    .eq("slug", parsedSlug.data);

  if (viewer?.role === "instructor") {
    query = query.or(
      `status.eq.published,instructor_id.eq.${viewer.id}`,
    );
  } else if (viewer?.role !== "admin") {
    query = query.eq("status", "published");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new CatalogueDataError("load course detail");
  }

  if (!data) {
    return null;
  }

  const course = parseRawCatalogueCourse(data);
  const enrolledCourseIds = await getEnrolledCourseIds(supabase, viewer, [
    course.id,
  ]);

  return toCatalogueCourseDetail(
    course,
    enrolledCourseIds.has(course.id),
  );
}

export async function getCatalogueCourseBySlugOrNotFound(slug: string) {
  const course = await getCatalogueCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return course;
}
