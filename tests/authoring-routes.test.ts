import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authoring/courses", () => ({
  listInstructorCourses: vi.fn(),
  getInstructorCourse: vi.fn(),
  createInstructorCourse: vi.fn(),
  updateInstructorCourse: vi.fn(),
}));
vi.mock("@/lib/authoring/modules", () => ({
  createCourseModule: vi.fn(),
  renameCourseModule: vi.fn(),
  reorderCourseModules: vi.fn(),
  deleteCourseModule: vi.fn(),
}));

import { GET as listCourses, POST as createCourse } from "@/app/api/instructor/courses/route";
import { GET as getCourse, PATCH as updateCourse } from "@/app/api/instructor/courses/[courseId]/route";
import { POST as createModule } from "@/app/api/instructor/courses/[courseId]/modules/route";
import { PUT as reorderModules } from "@/app/api/instructor/courses/[courseId]/modules/order/route";
import { DELETE as deleteModule, PATCH as renameModule } from "@/app/api/instructor/modules/[moduleId]/route";
import {
  createInstructorCourse,
  getInstructorCourse,
  listInstructorCourses,
  updateInstructorCourse,
} from "@/lib/authoring/courses";
import { AuthoringError } from "@/lib/authoring/errors";
import {
  createCourseModule,
  deleteCourseModule,
  renameCourseModule,
  reorderCourseModules,
} from "@/lib/authoring/modules";

const courseId = "11111111-1111-4111-8111-111111111111";
const moduleId = "22222222-2222-4222-8222-222222222222";
const course = {
  id: courseId,
  slug: "power-electronics-ee402",
  department: "EE",
  courseCode: "EE402",
  title: "Power Electronics",
  subtitle: null,
  description: null,
  priceHalalas: 25000,
  currency: "SAR" as const,
  status: "draft" as const,
  coverUrl: null,
  createdAt: "2026-09-05T12:00:00+00:00",
  publishedAt: null,
  modules: [],
};
const courseModule = { id: moduleId, courseId, title: "Introduction", position: 1 };

function jsonRequest(path: string, method: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("instructor course routes", () => {
  it("returns an uncached private course list", async () => {
    vi.mocked(listInstructorCourses).mockResolvedValue([course]);
    const response = await listCourses();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ data: [course] });
  });

  it("rejects protected fields when creating a course", async () => {
    const response = await createCourse(jsonRequest("/api/instructor/courses", "POST", {
      slug: "unsafe-course",
      department: "EE",
      courseCode: null,
      title: "Unsafe Course",
      subtitle: null,
      description: null,
      priceHalalas: 1000,
      coverUrl: null,
      status: "published",
    }));
    expect(response.status).toBe(422);
    expect(createInstructorCourse).not.toHaveBeenCalled();
  });

  it("creates a validated draft course", async () => {
    vi.mocked(createInstructorCourse).mockResolvedValue(course);
    const response = await createCourse(jsonRequest("/api/instructor/courses", "POST", {
      slug: course.slug,
      department: course.department,
      courseCode: course.courseCode,
      title: course.title,
      subtitle: null,
      description: null,
      priceHalalas: course.priceHalalas,
      coverUrl: null,
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ data: course });
  });

  it("rejects invalid course route identifiers", async () => {
    const response = await getCourse(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "invalid" }),
    });
    expect(response.status).toBe(404);
    expect(getInstructorCourse).not.toHaveBeenCalled();
  });

  it("updates only validated course fields", async () => {
    vi.mocked(updateInstructorCourse).mockResolvedValue({ ...course, title: "Updated" });
    const response = await updateCourse(
      jsonRequest(`/api/instructor/courses/${courseId}`, "PATCH", { title: "Updated" }),
      { params: Promise.resolve({ courseId }) },
    );
    expect(response.status).toBe(200);
    expect(updateInstructorCourse).toHaveBeenCalledWith(courseId, { title: "Updated" });
  });

  it("returns safe controlled authorization errors", async () => {
    vi.mocked(getInstructorCourse).mockRejectedValue(
      new AuthoringError(403, "instructor_required", "An instructor account is required."),
    );
    const response = await getCourse(new Request("http://localhost"), {
      params: Promise.resolve({ courseId }),
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "instructor_required" } });
  });
});

describe("instructor module routes", () => {
  it("creates a module through the atomic append service", async () => {
    vi.mocked(createCourseModule).mockResolvedValue(courseModule);
    const response = await createModule(
      jsonRequest(`/api/instructor/courses/${courseId}/modules`, "POST", { title: courseModule.title }),
      { params: Promise.resolve({ courseId }) },
    );
    expect(response.status).toBe(201);
    expect(createCourseModule).toHaveBeenCalledWith(courseId, courseModule.title);
  });

  it("rejects duplicate module order before calling the service", async () => {
    const response = await reorderModules(
      jsonRequest(`/api/instructor/courses/${courseId}/modules/order`, "PUT", { moduleIds: [moduleId, moduleId] }),
      { params: Promise.resolve({ courseId }) },
    );
    expect(response.status).toBe(422);
    expect(reorderCourseModules).not.toHaveBeenCalled();
  });

  it("renames a validated module", async () => {
    vi.mocked(renameCourseModule).mockResolvedValue({ ...courseModule, title: "Renamed" });
    const response = await renameModule(
      jsonRequest(`/api/instructor/modules/${moduleId}`, "PATCH", { title: "Renamed" }),
      { params: Promise.resolve({ moduleId }) },
    );
    expect(response.status).toBe(200);
    expect(renameCourseModule).toHaveBeenCalledWith(moduleId, "Renamed");
  });

  it("deletes a draft module without returning a body", async () => {
    vi.mocked(deleteCourseModule).mockResolvedValue(undefined);
    const response = await deleteModule(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ moduleId }),
    });
    expect(response.status).toBe(204);
    expect(deleteCourseModule).toHaveBeenCalledWith(moduleId);
  });
});
