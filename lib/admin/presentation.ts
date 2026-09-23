import type { AdminCourseListQuery, AdminPurchaseHistoryQuery, AdminUserListQuery } from "@/lib/contracts";

type SearchParameters = Record<string, string | string[] | undefined>;

export function parseSearchParameters(searchParameters: SearchParameters) {
  return Object.fromEntries(
    Object.entries(searchParameters).flatMap(([key, value]) =>
      typeof value === "string" && value.length > 0 ? [[key, value]] : [],
    ),
  );
}

export function toSearchString(parameters: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function withPage<T extends { page: number }>(query: T, page: number) {
  return { ...query, page };
}

export function dateInputToIso(
  value: string | undefined,
  boundary: "start" | "end",
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return undefined;

  const clock = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const date = new Date(`${value}T${clock}Z`);

  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

export function isoToDateInput(value: string | undefined) {
  return value?.slice(0, 10) ?? "";
}

export function formatHalalas(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatAdminDate(value: string | null) {
  if (value === null) return "—";

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const orderStatusLabel = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "فشل",
  refunded: "مسترد",
  reversed: "معكوس",
} as const;

export const courseStatusLabel = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  published: "منشور",
  archived: "مؤرشف",
} as const;

export const roleLabel = {
  learner: "متعلم",
  instructor: "مدرّس",
  admin: "مسؤول",
} as const;

export type AdminListQuery =
  | AdminCourseListQuery
  | AdminPurchaseHistoryQuery
  | AdminUserListQuery;
