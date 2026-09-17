import { InstructorProfileForm } from "@/components/instructor/InstructorProfileForm";
import { InstructorPageHeader, InstructorSection } from "@/components/instructor/InstructorPage";
import { getInstructorProfile } from "@/lib/authoring/profile";
import { getInstructorView } from "@/lib/authoring/view";

export default async function InstructorProfilePage() {
  await getInstructorView("/studio/profile");
  const { data: profile } = await getInstructorProfile();

  return (
    <>
      <InstructorPageHeader description="هذه المعلومات تظهر للمتعلمين في صفحات مقرراتك. ركّز على خبرتك وما يمكن أن يتوقعوه منك." title="ملفي العام" />
      <InstructorSection description="يمكنك تحديث الصورة والنبذة المهنية والتعريف الشخصي فقط." title="الهوية الظاهرة">
        <InstructorProfileForm profile={profile} />
      </InstructorSection>
    </>
  );
}
