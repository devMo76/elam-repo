import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authoring/publishing", () => ({
  submitInstructorCourse: vi.fn(),
  publishInstructorCourse: vi.fn(),
}));
vi.mock("@/lib/authoring/statistics", () => ({
  getInstructorStatistics: vi.fn(),
}));
vi.mock("@/lib/authoring/profile", () => ({
  getInstructorProfile: vi.fn(),
  updateInstructorProfile: vi.fn(),
}));

import { POST as publishCourse } from "@/app/api/instructor/courses/[courseId]/publish/route";
import { POST as submitCourse } from "@/app/api/instructor/courses/[courseId]/submit/route";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/instructor/profile/route";
import { GET as getStatistics } from "@/app/api/instructor/statistics/route";
import { AuthoringError } from "@/lib/authoring/errors";
import {
  publishInstructorCourse,
  submitInstructorCourse,
} from "@/lib/authoring/publishing";
import {
  getInstructorProfile,
  updateInstructorProfile,
} from "@/lib/authoring/profile";
import { getInstructorStatistics } from "@/lib/authoring/statistics";

const courseId = "11111111-1111-4111-8111-111111111111";
const instructorId = "22222222-2222-4222-8222-222222222222";
const profile = {
  data: {
    id: instructorId,
    fullName: "Instructor Example",
    avatarUrl: null,
    headline: "Electrical engineering instructor",
    bio: null,
  },
};

afterEach(() => vi.clearAllMocks());

describe("instructor publication routes", () => {
  it("submits an owned draft for review", async () => {
    vi.mocked(submitInstructorCourse).mockResolvedValue({
      courseId,
      status: "in_review",
    });
    const response = await submitCourse(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ courseId }),
    });

    expect(response.status).toBe(200);
    expect(submitInstructorCourse).toHaveBeenCalledWith(courseId);
    await expect(response.json()).resolves.toEqual({
      data: { courseId, status: "in_review" },
    });
  });

  it("rejects invalid course IDs before the service call", async () => {
    const response = await submitCourse(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ courseId: "invalid" }),
    });

    expect(response.status).toBe(404);
    expect(submitInstructorCourse).not.toHaveBeenCalled();
  });

  it("returns a clear error when direct publishing is disabled", async () => {
    vi.mocked(publishInstructorCourse).mockRejectedValue(
      new AuthoringError(
        403,
        "direct_publish_disabled",
        "Direct publishing is not enabled. Submit the course for review instead.",
      ),
    );
    const response = await publishCourse(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ courseId }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "direct_publish_disabled" },
    });
  });
});

describe("instructor statistics route", () => {
  it("returns private counts-only statistics", async () => {
    vi.mocked(getInstructorStatistics).mockResolvedValue({
      data: [
        {
          courseId,
          title: "Power Electronics",
          status: "published",
          enrollmentCount: 12,
        },
      ],
    });
    const response = await getStatistics();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.data[0]).toEqual({
      courseId,
      title: "Power Electronics",
      status: "published",
      enrollmentCount: 12,
    });
    expect(JSON.stringify(body)).not.toContain("amount");
    expect(JSON.stringify(body)).not.toContain("userId");
  });
});

describe("instructor profile route", () => {
  it("returns the private uncached public profile editor data", async () => {
    vi.mocked(getInstructorProfile).mockResolvedValue(profile);
    const response = await getProfile();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(profile);
  });

  it("updates approved public fields", async () => {
    vi.mocked(updateInstructorProfile).mockResolvedValue(profile);
    const request = new Request("http://localhost/api/instructor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline: profile.data.headline }),
    });
    const response = await updateProfile(request);

    expect(response.status).toBe(200);
    expect(updateInstructorProfile).toHaveBeenCalledWith({
      headline: profile.data.headline,
    });
  });

  it("rejects attempts to change protected profile fields", async () => {
    const request = new Request("http://localhost/api/instructor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", fullName: "Forged Name" }),
    });
    const response = await updateProfile(request);

    expect(response.status).toBe(422);
    expect(updateInstructorProfile).not.toHaveBeenCalled();
  });
});
