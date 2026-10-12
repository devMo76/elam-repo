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
## Staging rollout (2026-10-12)

Owner authorized deployment. Typography-only release
`ce1431773a025627f2511afec4f0e6c84e3ddade` pushed to `feat/staging-readiness`;
unrelated pending edits and course-detail wording were excluded. No database,
variable, DNS, healthcheck or other-service change required.

Railway deployment `7f1c9e5f-8fd8-4d35-aac9-a0b88f63f305` triggered directly for
that exact commit; Railway reports **SUCCESS**. Live HTTPS checks at 1440px and
390px confirm landing/catalogue Arabic labels use IBM Plex Sans Arabic and
automatic direction, both pages return 200 and have no horizontal overflow.
Railway diagnosed missing GitHub App installation for `devMo76/elam-repo`
(`NO_INSTALLATION`): branch configuration alone does not enable push deployment.
Owner must install/authorize the Railway GitHub App for this repository to enable
future automatic deployments. No installation/account permission was changed.
