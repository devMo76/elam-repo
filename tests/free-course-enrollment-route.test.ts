import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/enrollment/free", () => ({
  claimFreeCourse: vi.fn(),
  FreeCourseEnrollmentError: class FreeCourseEnrollmentError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { POST } from "@/app/api/courses/[courseId]/enroll/route";
import { claimFreeCourse, FreeCourseEnrollmentError } from "@/lib/enrollment/free";

const courseId = "41000000-0000-4000-8000-000000000001";

afterEach(() => vi.clearAllMocks());

describe("free course enrollment route", () => {
  it("returns the claimed course for an authorized learner", async () => {
    vi.mocked(claimFreeCourse).mockResolvedValue({
      data: { courseId, grantedAt: "2026-09-14T20:00:00+00:00" },
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ courseId }),
    });

    expect(response.status).toBe(200);
    expect(claimFreeCourse).toHaveBeenCalledWith(courseId);
  });

  it("rejects malformed course IDs before the enrolment service", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(claimFreeCourse).not.toHaveBeenCalled();
  });

  it("preserves the service authorization response", async () => {
    vi.mocked(claimFreeCourse).mockRejectedValue(
      new FreeCourseEnrollmentError(403, "learner_required", "A learner account is required to enroll."),
    );

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ courseId }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "learner_required", message: "A learner account is required to enroll." },
    });
  });
});
