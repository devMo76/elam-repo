import type { CatalogueCourseDetail } from "@/lib/contracts/catalogue";
import type { RawCatalogueCourse } from "@/lib/catalogue/transform";

export const rawPublishedCourseFixture = {
  id: "40000000-0000-4000-8000-000000000001",
  slug: "signals-and-systems-ee301",
  department: "EE",
  course_code: "EE301",
  title: "Signals and Systems",
  subtitle: "A structured introduction to signals.",
  description: "Synthetic catalogue contract fixture.",
  price_halalas: 35000,
  currency: "SAR",
  status: "published",
  cover_url: null,
  instructor: {
    id: "20000000-0000-4000-8000-000000000001",
    full_name: "Instructor Example",
    avatar_url: null,
    headline: "Electrical Engineering student instructor",
    bio: "Synthetic instructor profile.",
  },
  modules: [
    {
      id: "50000000-0000-4000-8000-000000000002",
      title: "System Analysis",
      position: 2,
      lessons: [
        {
          id: "60000000-0000-4000-8000-000000000003",
          title: "Linear Time-Invariant Systems",
          position: 1,
          duration_seconds: null,
          is_free_preview: false,
        },
      ],
    },
    {
      id: "50000000-0000-4000-8000-000000000001",
      title: "Signal Foundations",
      position: 1,
      lessons: [
        {
          id: "60000000-0000-4000-8000-000000000002",
          title: "Signal Transformations",
          position: 2,
          duration_seconds: 1080,
          is_free_preview: false,
        },
        {
          id: "60000000-0000-4000-8000-000000000001",
          title: "What Is a Signal?",
          position: 1,
          duration_seconds: 720,
          is_free_preview: true,
        },
      ],
    },
  ],
} satisfies RawCatalogueCourse;

export const catalogueCourseDetailFixture = {
  id: "40000000-0000-4000-8000-000000000001",
  slug: "signals-and-systems-ee301",
  department: "EE",
  courseCode: "EE301",
  title: "Signals and Systems",
  subtitle: "A structured introduction to signals.",
  description: "Synthetic catalogue contract fixture.",
  priceHalalas: 35000,
  currency: "SAR",
  coverUrl: null,
  durationSeconds: 1800,
  lessonCount: 3,
  instructor: {
    id: "20000000-0000-4000-8000-000000000001",
    fullName: "Instructor Example",
    avatarUrl: null,
    headline: "Electrical Engineering student instructor",
    bio: "Synthetic instructor profile.",
  },
  isEnrolled: true,
  visibility: "public",
  modules: [
    {
      id: "50000000-0000-4000-8000-000000000001",
      title: "Signal Foundations",
      position: 1,
      lessons: [
        {
          id: "60000000-0000-4000-8000-000000000001",
          title: "What Is a Signal?",
          position: 1,
          durationSeconds: 720,
          isFreePreview: true,
        },
        {
          id: "60000000-0000-4000-8000-000000000002",
          title: "Signal Transformations",
          position: 2,
          durationSeconds: 1080,
          isFreePreview: false,
        },
      ],
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      title: "System Analysis",
      position: 2,
      lessons: [
        {
          id: "60000000-0000-4000-8000-000000000003",
          title: "Linear Time-Invariant Systems",
          position: 1,
          durationSeconds: null,
          isFreePreview: false,
        },
      ],
    },
  ],
} satisfies CatalogueCourseDetail;
