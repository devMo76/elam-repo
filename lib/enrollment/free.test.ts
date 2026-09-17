import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { claimFreeCourse } from "./free";
import { createClient } from "@/lib/supabase/server";

const courseId = "40000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";

function learnerClient(rpc = vi.fn().mockResolvedValue({
  data: [{ course_id: courseId, granted_at: "2026-09-14T20:00:00+00:00" }],
  error: null,
})) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email_confirmed_at: "2026-09-14T10:00:00+00:00" } }, error: null }) },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { role: "learner" }, error: null }) })) })) })),
    rpc,
  };
}

afterEach(() => vi.clearAllMocks());

describe("claimFreeCourse", () => {
  it("claims a published free course for a confirmed learner", async () => {
    const client = learnerClient();
    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(claimFreeCourse(courseId)).resolves.toEqual({
      data: { courseId, grantedAt: "2026-09-14T20:00:00+00:00" },
    });
    expect(client.rpc).toHaveBeenCalledWith("claim_free_course", { target_course: courseId });
  });

  it("does not call the database for an unauthenticated visitor", async () => {
    const client = learnerClient();
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(claimFreeCourse(courseId)).rejects.toMatchObject({
      status: 401,
      code: "unauthenticated",
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("does not expose unavailable or paid courses as free", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "P0002" } });
    vi.mocked(createClient).mockResolvedValue(learnerClient(rpc) as never);

    await expect(claimFreeCourse(courseId)).rejects.toMatchObject({
      status: 404,
      code: "free_course_not_available",
    });
  });
});
