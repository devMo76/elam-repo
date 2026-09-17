import "server-only";

import { redirect } from "next/navigation";

import { getRoleHomePath, getViewer, type ApplicationRole, type Viewer } from "./viewer";

export async function redirectAuthenticatedUser() {
  const viewer = await getViewer();

  if (viewer !== null) {
    redirect(getRoleHomePath(viewer.role));
  }
}

export async function requireRole(
  requestedPath: string,
  role: ApplicationRole,
): Promise<Viewer> {
  const viewer = await getViewer();

  if (viewer === null) {
    redirect(`/auth/sign-in?next=${encodeURIComponent(requestedPath)}`);
  }

  if (viewer.role !== role) {
    redirect(getRoleHomePath(viewer.role));
  }

  return viewer;
}
