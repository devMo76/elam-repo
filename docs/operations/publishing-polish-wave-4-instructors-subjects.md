# Publishing polish — wave 4: instructors and subjects

## Implemented

- Replaced the old instructor-selection process with **بماذا يتميز الشارحون في إلام؟**, followed by the two requested benefits. Used **الشارحون** for grammatical agreement with the verb. Preserved `#vetting` so existing navigation and hero links continue to work.
- The two statements are a semantic list, stacked on mobile and aligned in two columns on desktop. Removed the previous review-process headings and explanatory paragraph.
- Renamed the homepage subject-card section **مواد الهندسة العامة** and removed its explanatory sentence.
- Cards come from the existing published-course database results. A presentation helper selects departments classified as general engineering or mathematics, or numeric MATH/MAT course codes. It normalizes Arabic diacritics and common department separators, preserves database ordering and does not change the original course collection.
- Added **عرض جميع الدورات** linking to the complete `/courses` catalog, and an honest empty state when no published courses match this group.
- Confirmed the FAQ already reads **لا. إلام منصة مستقلة…**, and the visible homepage uses Arabic branding. The intentionally bilingual browser title **إلام | Elam** remains as previously requested. Technical identifiers and domains are unchanged.

## Database evidence and boundaries

A read-only query of production published-course metadata confirmed that **Calculus 2**, by **عمار محمد اليافي**, is already classified as **الهندسة العامة**. It therefore appears naturally in the new group. The three electrical-engineering demo courses do not qualify. No teacher names, course titles or IDs are hardcoded in the selection rule.

For future math courses, set the course department to **الرياضيات** or **الهندسة العامة**, or provide its numeric MATH/MAT code. An unrelated course by the same instructor is not automatically classified as mathematics. The full catalog, featured latest course, access rules, publication, payments and enrollment are unchanged. No database writes or migrations were needed.

This grouping supersedes wave 3's statement that the homepage grid lists every published course. The full `/courses` page still does.

## Files

- `lib/copy.ts`: section copy, subject heading, empty state and browse link.
- `components/sections/Vetting.tsx`: two instructor-benefit statements.
- `components/sections/Catalog.tsx`: database-metadata grouping and full-catalog link.
- `lib/catalogue/homepage-subjects.ts` and its tests: selection policy and normalization.
- Browser fixture and regression suite: actual components, matching/nonmatching courses, empty state, FAQ and responsive themes.

## Verification

- TypeScript and repository-wide lint passed.
- **407 tests across 76 files passed**, including 12 new subject-selection cases.
- The existing **32 browser checks passed**; after the final fixture/assertion additions, all **4 affected browser checks passed** again. These cover 320px, 390px and 1440px layouts in both themes, exclusion of unrelated electrical courses, the empty state, the full-catalog link and Arabic FAQ wording.
- The normal Next.js production build passed.
- Visually reviewed the saved 390px light-theme screenshot: the new heading, benefits and subject cards wrap cleanly without horizontal overflow.

Browser tests use local fixtures. Production metadata was inspected read-only; the updated rendering has not been deployed or verified live.

## Manual review

1. Open the local homepage: confirm the new instructor heading and both benefits, with no old review-process copy.
2. Confirm **مواد الهندسة العامة** contains Calculus 2 when connected to the current production-like data, and excludes unrelated electrical courses.
3. Open **عرض جميع الدورات** and confirm the full catalog remains available.
4. Check the sections on phone and desktop in light and dark mode.
5. Expand the university-affiliation FAQ: confirm **لا. إلام منصة مستقلة…**.

Implemented locally. **Not deployed.** Include this wave with the pending polish release after review.
