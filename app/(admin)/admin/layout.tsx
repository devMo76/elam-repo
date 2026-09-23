import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/AdminShell";
import { getViewer } from "@/lib/auth/viewer";

/**
 * This persistent route layout keeps navigation in place while Next fetches
 * only the changed server page. Individual pages still enforce the precise
 * admin redirect destination through `getAdminView(path)`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  if (viewer?.role !== "admin") return children;

  return <AdminShell viewer={viewer}>{children}</AdminShell>;
}
