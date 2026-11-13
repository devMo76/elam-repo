# Featured course description hotfix — 2026-11-13

## Report and fix

The homepage featured-course card rendered every module in a published course. A course with many chapters therefore stretched the card and its colored identity panel far beyond a useful preview.

The card now displays **عن الدورة** and the saved course description instead of the chapter list. Blank descriptions fall back to the subtitle; if both are empty the preview block is omitted. The description is plain escaped text, preserves paragraph breaks, wraps long words, and is visually limited to six lines. Title, instructor, duration, lesson count, price, free-preview indicator and the full-card link remain available. The complete curriculum stays on the course detail page.

No course records, publication state, access permissions, provider settings, or payment logic are modified.

## Release scope

This is a separate production hotfix based on commit `17fa5db414d2701a7d7f251351786c86fa557d8b`. It excludes the pending night-mode, bilingual-title, wording/logo/navigation and hero-image polish wave. The same featured-course fix is mirrored into the original backend worktree so the future polish release retains it.

## Verification

Browser regressions cover a 100-chapter course with a long description at phone/desktop widths, the six-line bound and compact card height, no horizontal overflow, subtitle fallback, omission when no description exists, and escaped markup. Existing learner/instructor/admin video regressions run alongside these cases. TypeScript/lint, clean CI build/database checks and live release evidence are recorded after completion.

Local production-based verification: **354 backend tests / 74 files**, **23 browser tests**, TypeScript, full lint and patch-format checks passed. Phone/desktop screenshots were inspected. A stale `.next/types/app` directory from the earlier failed diagnostic Webpack build was removed after checking its exact resolved path; no source or database data was removed.

## Manual acceptance

1. Open the production homepage and find the featured course.
2. Confirm its description replaces the module list, even if it has many chapters.
3. Check on phone and desktop; a long description must not stretch the card indefinitely.
4. Open the card and confirm the full description and all chapters remain on the course page.
5. Confirm price, instructor and lesson/duration metadata still match the course.

Deployment pending.
