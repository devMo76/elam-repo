import { createRoot } from "react-dom/client";
import "../../../app/globals.css";
import { useState, useEffect } from "react";
import { AdminInstructorUpdateControl, AdminCourseActions } from "../../../components/admin/AdminMutations";
import { CoursePlayer } from "../../../components/learning/CoursePlayer";
import type { CatalogueCourseDetail } from "../../../lib/contracts/catalogue";
import { InstructorCourseEditor } from "../../../components/instructor/InstructorCourseEditor";
import { InstructorUploadProvider } from "../../../components/instructor/InstructorUploadManager";
import { InstructorNavigationBlockerProvider } from "../../../components/instructor/InstructorNavigationBlocker";
import { InstructorVideoPreview } from "../../../components/instructor/InstructorVideoPreview";
import type { StudioCourse, StudioLesson } from "../../../components/instructor/studio-types";

const course: CatalogueCourseDetail & { completedLessonIds: string[]; resumeLessonId: null } = {
  id: "40000000-0000-4000-8000-000000000001", slug: "video-regression",
  title: "دورة اختبار المشغّل", department: "الهندسة", courseCode: null,
  subtitle: null, description: null, visibility: "public", coverUrl: null,
  priceHalalas: 1000, currency: "SAR", durationSeconds: 120, lessonCount: 2,
  instructor: { id: "20000000-0000-4000-8000-000000000001", fullName: "شارح", avatarUrl: null, headline: null, bio: null },
  isEnrolled: !location.search.includes("locked"), completedLessonIds: [], resumeLessonId: null,
  modules: [{ id: "50000000-0000-4000-8000-000000000001", title: "الوحدة الأولى", position: 1,
    lessons: [1, 2].map((position) => ({ id: `60000000-0000-4000-8000-00000000000${position}`,
      title: `الدرس ${position}`, position, durationSeconds: 60, isFreePreview: position === 1 })) }],
};
const studioCourse: StudioCourse = { ...course, createdAt: "2026-11-06T00:00:00Z", publishedAt: null,
  publishedEditsAllowed: location.search.includes("enabled"),
  status: location.search.includes("readonly") ? "published" : "draft",
  modules: course.modules.map(module => ({ ...module, courseId: course.id,
    lessons: module.lessons.map(lesson => ({ ...lesson, moduleId: module.id, mediaStatus: "ready" })) })),
};
function PreviewFixture() {
  const [status, setStatus] = useState<StudioLesson["mediaStatus"]>("processing");
  return <><button onClick={() => setStatus("ready")}>Finish processing</button>
    <button onClick={() => setStatus("failed")}>Fail processing</button>
    <InstructorVideoPreview active lessonId={course.modules[0].lessons[0].id} lessonTitle="الدرس 1" mediaStatus={status} /></>;
}
function PermissionsFixture() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const refresh = () => setAllowed(value => !value);
    window.addEventListener("fixture:refresh", refresh);
    return () => window.removeEventListener("fixture:refresh", refresh);
  }, []);
  return <><AdminInstructorUpdateControl instructorId={course.instructor.id} instructorName="شارح الاختبار" allowed={allowed} />
    <AdminCourseActions courseId={course.id} courseTitle={course.title} currentStatus="published" canPublish publishedEditsAllowed={allowed} /></>;
}
const view = location.search.includes("permissions") ? <PermissionsFixture /> : location.search.includes("studio")
  ? <InstructorNavigationBlockerProvider><InstructorUploadProvider>
      <InstructorCourseEditor course={studioCourse} publishingCapability={{ canDirectPublish: false, primaryWorkflow: "review" }} />
    </InstructorUploadProvider></InstructorNavigationBlockerProvider>
  : location.search.includes("preview") ? <PreviewFixture /> : <CoursePlayer course={course} initialLessonId={null} />;
createRoot(document.getElementById("root")!).render(<main dir="rtl">{view}</main>);
