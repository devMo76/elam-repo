type SubjectMetadata = { department: string; courseCode: string | null };

function normalizeDepartment(value: string) {
  return value.normalize("NFKC").replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا").replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isGeneralEngineeringCourse(course: SubjectMetadata) {
  const department = normalizeDepartment(course.department);
  return /^(?:ال)?هندسة (?:ال)?عامة$/.test(department)
    || department === "general engineering"
    || /(?:^|\s)(?:ال)?رياضيات(?:\s|$)/.test(department)
    || /\b(?:mathematics|math)\b/.test(department)
    || /^(?:math|mat)\s*[-_]?\s*\d/i.test(course.courseCode?.trim() ?? "");
}

// Presentation grouping only. Keep query order, DTOs and access rules intact.
export function isElectricalEngineeringCourse(course: SubjectMetadata) {
  if (isGeneralEngineeringCourse(course)) return false;

  const department = normalizeDepartment(course.department);
  return /^(?:(?:قسم|مواد|دورات) )?(?:ال)?هندسة (?:ال)?كهربائية$/.test(department)
    || department === "electrical engineering"
    || /^ee\s*[-_]?\s*\d/i.test(course.courseCode?.trim() ?? "");
}

export function selectGeneralEngineeringCourses<T extends SubjectMetadata>(courses: readonly T[]) {
  return courses.filter(isGeneralEngineeringCourse);
}
