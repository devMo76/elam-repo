import { InstructorCourseCreateForm } from "@/components/instructor/InstructorCourseForms";
import { InstructorPageHeader, InstructorSection } from "@/components/instructor/InstructorPage";
import { getInstructorView } from "@/lib/authoring/view";

export default async function NewInstructorCoursePage() {
  await getInstructorView("/studio/courses/new");

  return (
    <>
      <InstructorPageHeader title="إنشاء مقرر" />
      <InstructorSection title="تفاصيل المقرر">
        <InstructorCourseCreateForm />
      </InstructorSection>
    </>
  );
}
