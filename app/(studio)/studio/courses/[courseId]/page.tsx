import { notFound } from "next/navigation";
import { z } from "zod";

import { InstructorCourseEditor } from "@/components/instructor/InstructorCourseEditor";
import { getInstructorCourse } from "@/lib/authoring/courses";
import { AuthoringError } from "@/lib/authoring/errors";
import { getInstructorView } from "@/lib/authoring/view";

type InstructorCoursePageProps = { params: Promise<{ courseId: string }> };

async function loadInstructorCourse(courseId: string) {
  try {
    return await getInstructorCourse(courseId);
  } catch (error) {
    if (error instanceof AuthoringError && error.status === 404) notFound();
    throw error;
  }
}

export default async function InstructorCoursePage({ params }: InstructorCoursePageProps) {
  const { courseId } = await params;

  if (!z.uuid().safeParse(courseId).success) notFound();

  await getInstructorView(`/studio/courses/${courseId}`);

  const course = await loadInstructorCourse(courseId);
  return <InstructorCourseEditor course={course} />;
}
