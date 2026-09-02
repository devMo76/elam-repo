import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getManagedVideoLesson } from "@/lib/video/lesson-access";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";
const moduleId = "44444444-4444-4444-8444-444444444444";
const courseId = "55555555-5555-4555-8555-555555555555";
const createClientMock = vi.mocked(createClient);

type QueryResult = { data: unknown; error: unknown };

function createQuery(result: QueryResult) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function configureClient({
  role,
  instructorId = userId,
  authenticated = true,
}: {
  role: "learner" | "instructor" | "admin";
  instructorId?: string;
  authenticated?: boolean;
}) {
  const queries = {
    profiles: createQuery({ data: { role }, error: null }),
    lessons: createQuery({
      data: {
        id: lessonId,
        title: "Test lesson",
        module_id: moduleId,
        media_status: "processing",
        video_asset_id: "66666666-6666-4666-8666-666666666666",
      },
      error: null,
    }),
    modules: createQuery({ data: { course_id: courseId }, error: null }),
    courses: createQuery({
      data: { instructor_id: instructorId },
      error: null,
    }),
  };

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? { id: userId } : null },
        error: null,
      }),
    },
    from: vi.fn((table: keyof typeof queries) => queries[table]),
  };

  createClientMock.mockResolvedValue(client as never);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("managed video lesson access", () => {
  it("allows the instructor who owns the course", async () => {
    configureClient({ role: "instructor" });

    await expect(getManagedVideoLesson(lessonId)).resolves.toMatchObject({
      success: true,
      lesson: { id: lessonId, mediaStatus: "processing" },
    });
  });

  it("allows an administrator without course ownership", async () => {
    configureClient({ role: "admin", instructorId: otherUserId });

    await expect(getManagedVideoLesson(lessonId)).resolves.toMatchObject({
      success: true,
    });
  });

  it("rejects a different instructor", async () => {
    configureClient({ role: "instructor", instructorId: otherUserId });

    await expect(getManagedVideoLesson(lessonId)).resolves.toMatchObject({
      success: false,
      status: 403,
      code: "forbidden",
    });
  });

  it("rejects a learner even if inconsistent data names them as owner", async () => {
    configureClient({ role: "learner" });

    await expect(getManagedVideoLesson(lessonId)).resolves.toMatchObject({
      success: false,
      status: 403,
      code: "forbidden",
    });
  });

  it("rejects an unauthenticated request", async () => {
    configureClient({ role: "instructor", authenticated: false });

    await expect(getManagedVideoLesson(lessonId)).resolves.toMatchObject({
      success: false,
      status: 401,
      code: "unauthenticated",
    });
  });
});
