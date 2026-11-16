import { describe, expect, it } from "vitest";
import { isGeneralEngineeringCourse, selectGeneralEngineeringCourses } from "./homepage-subjects";

describe("homepage general-engineering subjects", () => {
  it.each([
    ["الهندسة العامة", null], ["الهندسة العَامّة", null],
    ["General Engineering", null], ["الرياضيات", null],
    ["قسم الرياضيات", null], ["Mathematics", null],
    ["الهندسة الكهربائية", "MATH 101"], ["الهندسة", "MAT-201"],
  ])("includes department %s and code %s", (department, courseCode) => {
    expect(isGeneralEngineeringCourse({ department, courseCode })).toBe(true);
  });

  it.each([
    ["الهندسة الكهربائية", "EE301"], ["الهندسة", "MATLAB101"], ["", null],
  ])("excludes unrelated department %s and code %s", (department, courseCode) => {
    expect(isGeneralEngineeringCourse({ department, courseCode })).toBe(false);
  });

  it("preserves database ordering and course objects without changing the source catalogue", () => {
    const general = { department: "الهندسة العامة", courseCode: null };
    const electrical = { department: "الهندسة الكهربائية", courseCode: "EE301" };
    const math = { department: "الرياضيات", courseCode: null };
    const courses = [general, electrical, math];
    const selected = selectGeneralEngineeringCourses(courses);
    expect(selected).toEqual([general, math]);
    expect(selected[0]).toBe(general);
    expect(courses).toHaveLength(3);
    expect(selectGeneralEngineeringCourses([electrical])).toEqual([]);
  });
});
