import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./access", () => ({
  requireInstructorAuthoringContext: vi.fn(),
}));

import { requireInstructorAuthoringContext } from "./access";
import { createInstructorCourse, updateInstructorCourse } from "./courses";

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

describe("instructor course detail update policy", () => {
  beforeEach(() => vi.clearAllMocks());

  function setup(status: string, allowed = false, exists = true) {
    const accessResult = vi.fn().mockResolvedValue({
      data: exists ? { status, slug: rawCourse.slug, price_halalas: 0, instructor_published_edits_allowed: allowed } : null,
      error: null,
    });
    const updateResult = vi.fn().mockResolvedValue({ data: { ...rawCourse, status }, error: null });
    const accessQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: accessResult };
    accessQuery.select.mockReturnValue(accessQuery);
    accessQuery.eq.mockReturnValue(accessQuery);
    const updateQuery = { update: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: updateResult };
    updateQuery.update.mockReturnValue(updateQuery);
    updateQuery.select.mockReturnValue(updateQuery);
    updateQuery.eq.mockReturnValue(updateQuery);
    const from = vi.fn().mockReturnValueOnce(accessQuery).mockReturnValue(updateQuery);
    vi.mocked(requireInstructorAuthoringContext).mockResolvedValue({
      supabase: { from }, user: { id: "20000000-0000-4000-8000-000000000001" },
    } as never);
    return { from, accessQuery, accessResult, updateQuery, updateResult };
  }

  it("allows owned draft commercial edits", async () => {
    const { updateQuery, accessQuery } = setup("draft");
    await updateInstructorCourse(rawCourse.id, { priceHalalas: 1000, slug: "new-draft-url" });
    expect(accessQuery.eq).toHaveBeenCalledWith("instructor_id", "20000000-0000-4000-8000-000000000001");
    expect(updateQuery.update).toHaveBeenCalledWith({ price_halalas: 1000, slug: "new-draft-url" });
    expect(updateQuery.eq).toHaveBeenCalledWith("status", "draft");
  });

  it.each(["in_review", "archived", "published"])("blocks detail edits in locked state %s", async (status) => {
    const { from } = setup(status);
    await expect(updateInstructorCourse(rawCourse.id, { title: "New title" }))
      .rejects.toMatchObject({ status: 403, code: "course_details_locked" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("allows enabled live details with unchanged price and URL", async () => {
    const { updateQuery } = setup("published", true);
    await updateInstructorCourse(rawCourse.id, { title: "New title", priceHalalas: 0, slug: rawCourse.slug });
    expect(updateQuery.update).toHaveBeenCalledWith({ title: "New title", price_halalas: 0, slug: rawCourse.slug });
    expect(updateQuery.eq).toHaveBeenCalledWith("status", "published");
  });

  it.each([{ priceHalalas: 1000 }, { slug: "changed-live-url" }])("rejects live commercial changes %j", async (input) => {
    const { from } = setup("published", true);
    await expect(updateInstructorCourse(rawCourse.id, input))
      .rejects.toMatchObject({ status: 403, code: "course_commercial_fields_locked" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("returns not-found for an inaccessible or missing course", async () => {
    const { from } = setup("draft", false, false);
    await expect(updateInstructorCourse(rawCourse.id, { title: "New title" }))
      .rejects.toMatchObject({ status: 404, code: "course_not_found" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("preserves database denial when permission is revoked after the preflight read", async () => {
    const { updateResult } = setup("published", true);
    updateResult.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(updateInstructorCourse(rawCourse.id, { title: "New title" }))
      .rejects.toMatchObject({ status: 403, code: "forbidden" });
  });

  it("does not write if the policy read fails", async () => {
    const { accessResult, from } = setup("draft");
    accessResult.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(updateInstructorCourse(rawCourse.id, { title: "New title" }))
      .rejects.toMatchObject({ status: 500, code: "authoring_failed" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not report success when a concurrent status change filters out the write", async () => {
    const { updateResult } = setup("draft");
    updateResult.mockResolvedValue({ data: null, error: null });
    await expect(updateInstructorCourse(rawCourse.id, { title: "New title" }))
      .rejects.toMatchObject({ status: 404, code: "course_not_found" });
  });
});
