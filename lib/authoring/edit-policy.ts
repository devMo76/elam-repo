import type { Database } from "@/lib/supabase/database.types";

type CourseStatus = Database["public"]["Enums"]["course_status"];

/** Proposed instructor policy. This is not a substitute for database enforcement. */
export function getInstructorEditPolicy({
  status,
  isOwner,
  publishedEditsAllowed = false,
}: {
  status: CourseStatus;
  isOwner: boolean;
  publishedEditsAllowed?: boolean;
}) {
  const draft = isOwner && status === "draft";
  const live = isOwner && status === "published" && publishedEditsAllowed;

  return {
    canInspect: isOwner,
    canEditDescription: draft || live,
    canChangePriceOrSlug: draft,
    canPrepareAdditions: draft || live,
    canEditExistingCurriculum: draft,
    canReplaceExistingMedia: draft,
    canRemoveExistingContent: draft,
    canReleasePreparedAdditions: live,
    reason: !isOwner ? "not_owner" : draft ? "draft" : live ? "published_allowed"
      : status === "published" ? "published_locked" : status === "in_review" ? "in_review" : "archived",
  } as const;
}
