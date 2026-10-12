# Arabic course identity font correction

2026-10-12. The featured landing card, landing catalogue tiles, `/courses` cards
and course-detail identity labels could render Arabic departments in a Latin-only
monospace font. The browser substituted a different Arabic face. In the reported
screenshot, `الهندسة الكهربائية` is the department fallback, not the `Test 1`
course title; the large identity panel incorrectly used the numeric `Num` wrapper.

Added shared `CourseLabel`: Arabic or mixed Arabic/Latin labels use the existing
IBM Plex Sans Arabic (`font-sans`) and automatic direction. Latin/numeric course
codes retain `Num` isolation, tabular figures and IBM Plex Mono. All four public
course surfaces use this component. Removed competing CSS-module monospace rules,
including the detail page's undefined `--font-ibm-plex-mono` reference.

No database, content, layout, size, weight, font asset or dependency changes.
The separate prior course-heading weight/style edits remain preserved.
Six regression cases cover Arabic, mixed-language and Latin/numeric labels.
Local Edge verification at 1440px and 390px confirms Arabic labels resolve to
IBM Plex Sans Arabic on the landing page, catalogue and course detail; landing
and catalogue have no horizontal overflow. All 333 application tests pass.
Typecheck, lint and production build pass. Latin/numeric regression cases preserve
`Num` styling. Computed font checks succeeded; screenshot attempts were obscured
by the existing scroll-reveal wrapper remaining transparent in the test browser,
so no successful visual screenshot comparison is claimed.
Staging deployment is
separate; no push/deployment is implied by this local fix.
