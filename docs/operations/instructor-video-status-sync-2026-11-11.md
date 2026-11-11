# Instructor video status synchronization — 2026-11-11

The upload manager received live provider statuses while the course editor retained an earlier course snapshot. Only mounting an individual lesson's upload control synchronized that lesson. Unopened lessons and module processing counts could therefore disagree with the floating tracker.

The editor now derives a course view using tracked statuses scoped to the course/lesson. Lesson badges, module processing/failure counts, ready-lesson totals, previews, and publication readiness consume that view. Status transitions are conditionally checkpointed into the editor's own state, so dismissing completed tracker entries cannot restore stale statuses. No child updates parent state during render; the guarded checkpoint updates this component only and stops once statuses match.

No backend/provider mutations, permissions, or publication validation were changed. This does not accelerate Bunny encoding or allow interrupting unfinished browser uploads.

Validation: TypeScript passed; focused ESLint passed; **14 browser tests passed**. The added regression restores two processing jobs, leaves their lesson editors unopened, returns ready for one and failed for the other, checks lesson labels/module counts/course totals, dismisses the completed tracker entries, and reopens the dialog to verify retained status. Existing video switching, preview, and instructor permission checks also pass.

The code fix is mirrored into the original backend worktree; the focused regression is in this production-based checkout. Deployment is pending.

Manual acceptance after deployment: upload several lessons, leave lesson editors closed, observe tracker/list/count agreement as processing completes, then dismiss tracker entries and reopen content to confirm statuses remain correct. Open a ready lesson and verify preview playback.
