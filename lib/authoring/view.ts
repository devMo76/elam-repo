import "server-only";

import { requireRole } from "@/lib/auth/guards";

/**
 * Establishes the route-level boundary before a studio page reads authoring
 * data. The query services enforce ownership again at the data boundary.
 */
export async function getInstructorView(path: string) {
  const viewer = await requireRole(path, "instructor");

  return { viewer };
}
