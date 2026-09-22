import "server-only";

import { redirect } from "next/navigation";

import { getSafeRedirectPath } from "./redirect";
import { getRoleHomePath, getViewer, type ApplicationRole, type Viewer } from "./viewer";

export async function redirectAuthenticatedUser(requestedPath?: string) {
  const viewer = await getViewer();

  if (viewer !== null) {
    redirect(
      getSafeRedirectPath(
        requestedPath ?? null,
        getRoleHomePath(viewer.role),
      ),
    );
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
