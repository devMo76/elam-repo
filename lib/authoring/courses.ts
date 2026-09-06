import "server-only";

import type {
  CreateAuthoringCourseRequest,
  UpdateAuthoringCourseRequest,
} from "@/lib/contracts";

import { requireInstructorAuthoringContext } from "./access";
import { AuthoringError, throwAuthoringDatabaseError } from "./errors";
import { toAuthoringCourse } from "./transform";

const courseSelect = `
  id, slug, department, course_code, title, subtitle, description,
  price_halalas, currency, status, cover_url, created_at, published_at,
  modules (id, course_id, title, position)
`;

export async function listInstructorCourses() {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("courses")
    .select(courseSelect)
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throwAuthoringDatabaseError(error, "Courses could not be loaded.");
  }

  return data.map(toAuthoringCourse);
}

export async function getInstructorCourse(courseId: string) {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("courses")
    .select(courseSelect)
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (error) {
    throwAuthoringDatabaseError(error, "The course could not be loaded.");
  }

  if (!data) {
    throw new AuthoringError(404, "course_not_found", "The course was not found.");
  }

  return toAuthoringCourse(data);
}

export async function createInstructorCourse(input: CreateAuthoringCourseRequest) {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      slug: input.slug,
      department: input.department,
      course_code: input.courseCode,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      price_halalas: input.priceHalalas,
      currency: "SAR",
      status: "draft",
      cover_url: input.coverUrl,
      instructor_id: user.id,
    })
    .select(courseSelect)
    .single();

  if (error) {
    throwAuthoringDatabaseError(error, "The course could not be created.");
  }

  return toAuthoringCourse(data);
}

export async function updateInstructorCourse(
  courseId: string,
  input: UpdateAuthoringCourseRequest,
) {
  const { supabase, user } = await requireInstructorAuthoringContext();
  const changes = {
    ...(input.slug === undefined ? {} : { slug: input.slug }),
    ...(input.department === undefined ? {} : { department: input.department }),
    ...(input.courseCode === undefined ? {} : { course_code: input.courseCode }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.subtitle === undefined ? {} : { subtitle: input.subtitle }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.priceHalalas === undefined ? {} : { price_halalas: input.priceHalalas }),
    ...(input.coverUrl === undefined ? {} : { cover_url: input.coverUrl }),
  };

  const { data, error } = await supabase
    .from("courses")
    .update(changes)
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .neq("status", "archived")
    .select(courseSelect)
    .maybeSingle();

  if (error) {
    throwAuthoringDatabaseError(error, "The course could not be updated.");
  }

  if (!data) {
    throw new AuthoringError(404, "course_not_found", "The editable course was not found.");
  }

  return toAuthoringCourse(data);
}
