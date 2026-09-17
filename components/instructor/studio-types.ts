export type StudioLesson = {
  id: string;
  moduleId: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  isFreePreview: boolean;
  mediaStatus: "absent" | "uploading" | "processing" | "ready" | "failed";
};

export type StudioModule = {
  id: string;
  courseId: string;
  title: string;
  position: number;
  lessons: StudioLesson[];
};

export type StudioCourse = {
  id: string;
  slug: string;
  department: string;
  courseCode: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceHalalas: number;
  currency: "SAR";
  status: "draft" | "in_review" | "published" | "archived";
  coverUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
  modules: StudioModule[];
};

export type AuthoringApiError = {
  error?: {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string[]>;
  };
};
