import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./access", () => ({
  requireInstructorAuthoringContext: vi.fn(),
}));

import { requireInstructorAuthoringContext } from "./access";
import { createInstructorCourse } from "./courses";

const rawCourse = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "alasharat-walanzmh",
  department: "الهندسة الكهربائية",
  course_code: null,
  title: "الإشارات والأنظمة",
  subtitle: null,
  description: null,
  price_halalas: 0,
  currency: "SAR",
  status: "draft",
  cover_url: null,
  created_at: "2026-09-18T12:00:00+00:00",
  published_at: null,
  modules: [],
};

function courseInsert(single: ReturnType<typeof vi.fn>) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    }),
  };
}

const input = {
  department: rawCourse.department,
  courseCode: null,
  title: rawCourse.title,
  subtitle: null,
  description: null,
  priceHalalas: 0,
  coverUrl: null,
};

describe("instructor course creation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an Arabic-titled course without requiring a technical slug", async () => {
    const single = vi.fn().mockResolvedValue({ data: rawCourse, error: null });
    const query = courseInsert(single);
    vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({
      supabase: { from: vi.fn().mockReturnValue(query) },
      user: { id: "20000000-0000-4000-8000-000000000001" },
    } as never);

    await expect(createInstructorCourse(input)).resolves.toMatchObject({
      slug: rawCourse.slug,
      title: rawCourse.title,
    });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "alasharat-walanzmh" }),
    );
  });

  it("retries a generated slug with a suffix when another course uses it", async () => {
    const firstSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505" },
    });
    const secondSingle = vi.fn().mockResolvedValue({
      data: { ...rawCourse, slug: "alasharat-walanzmh-2" },
      error: null,
    });
    const firstQuery = courseInsert(firstSingle);
    const secondQuery = courseInsert(secondSingle);
    const from = vi.fn()
      .mockReturnValueOnce(firstQuery)
      .mockReturnValueOnce(secondQuery);
    vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({
      supabase: { from },
      user: { id: "20000000-0000-4000-8000-000000000001" },
    } as never);

    await expect(createInstructorCourse(input)).resolves.toMatchObject({
      slug: "alasharat-walanzmh-2",
    });
    expect(secondQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "alasharat-walanzmh-2" }),
    );
  });
});
