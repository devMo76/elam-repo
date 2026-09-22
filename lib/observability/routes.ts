import type { PerformanceRoute } from "./contracts";

export function classifyPerformanceRoute(pathname: string): PerformanceRoute {
  if (pathname === "/") return "marketing";
  if (pathname === "/courses") return "catalogue";
  if (/^\/courses\/[^/]+\/?$/u.test(pathname)) return "course-detail";
  if (pathname.startsWith("/auth/")) return "auth";
  if (pathname === "/dashboard") return "learner-dashboard";
  if (/^\/learn\/courses\/[^/]+\/?$/u.test(pathname)) return "course-player";
  if (pathname === "/studio") return "studio-overview";
  if (pathname === "/studio/courses") return "studio-courses";
  if (pathname === "/studio/courses/new") return "studio-course-new";
  if (/^\/studio\/courses\/[^/]+\/?$/u.test(pathname)) {
    return "studio-course-editor";
  }
  if (pathname === "/studio/profile") return "studio-profile";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/account") return "account";
  return "other";
}
