import { formatArabicMinutes } from "@/lib/format";

const westernNumber = new Intl.NumberFormat("en-US");

export function courseCardCode(courseCode: string | null, department: string) {
  if (courseCode === null) return department;

  return courseCode.replace(/^EE[\s-]*/i, "") || courseCode;
}

export function formatArabicLessonCount(count: number) {
  const number = westernNumber.format(count);

  if (count === 0) return "لا دروس";
  if (count === 1) return "درس واحد";
  if (count === 2) return "درسين";
  if (count >= 3 && count <= 10) return `${number} دروس`;
  if (count >= 11 && count <= 99) return `${number} درسًا`;
  return `${number} درس`;
}

export function formatArabicDuration(seconds: number) {
  return formatArabicMinutes(seconds / 60);
}
