# Publishing polish — wave 2: hero

## Requested changes and layout

- Replace the old engineering tagline with the supplied introduction and aspiration to help subscribers achieve high grades.
- Use **كيف نختار الشارحين** for the hero's secondary action.
- Place the three benefits directly below the introductory explanation at the same font size and color. Put both actions below the benefits.
- Remove **ما ننشر أي شرح قبل ما نسمعه ونراجعه** from the hero.
- Use the supplied three points, in order: **أول درس في كل مادة مجاني**; **شرح سهل الاستيعاب**; **شرح باللغة العربية**.

The first sentence is the heading: **في إلام، دوراتنا تشرح لك المواد الصعبة بطريقة سهلة**. The supporting paragraph completes the requested text: **ونهدف لحصول مشتركينا على أعلى الدرجات، ودوراتنا تتميز بـ:**. Spelling is normalized in **أعلى** and **الاستيعاب**.

The longer heading uses a responsive 28–40px scale and comfortable Arabic line height. The supporting paragraph and bullets share an 18–20px scale, a common text color, and one vertical reading flow. Buttons stack on phones and sit alongside one another when space permits. The icon order now matches free lesson, understandable explanation and Arabic language. Optional hero animation follows the content order, with actions appearing after the benefits.

The supplied **مادة / المواد الصعبة** wording is an intentional subject-matter exception to wave 1's course terminology. Catalog, purchase and learner interface labels retain **الدورات**. The secondary hero action is a wave 2 override; the general header/footer process link and section title remain **كيف نعمل في المنصة** from wave 1. Link destinations remain `#catalog` and `#vetting`.

## Wave 1 release blocker

The previously discovered reduced-motion SSR visibility issue is fixed locally. `Reveal` emits a `data-reveal` marker; reduced-motion CSS overrides the library's hidden inline opacity and translation before hydration. No normal-motion behavior is changed. Browser regressions use actual server-generated markup and verify pre-hydration, post-hydration and JavaScript-disabled visibility.

Wave 1's implementation is therefore complete locally, including the follow-up. It has **not been deployed or signed off on production**.

## Files and verification

- `lib/copy.ts`: requested hero text and benefits; stale length/ordering comments removed.
- `components/sections/Hero.tsx`: heading scale, reading order, matching paragraph/list typography and lower action row.
- `components/sections/HeroMotion.module.css`: animation order follows the new layout.
- `components/ui/Reveal.tsx`, `app/globals.css`: reduced-motion SSR guard.
- Browser fixture and regression suite: updated hero checks at 320px, 390px and 1440px in both themes, action positions/destinations, matching font sizes, exact benefit order, removed text and real SSR visibility tests.

Combined local verification passed:

- **394 tests across 74 files**, including theme initialization and contrast checks.
- **32 browser checks**, covering the revised hero in light/dark modes at 320px, 390px and 1440px; the new real-SSR reduced-motion cases; the compact featured card; and existing video, admin-review and upload-status flows.
- TypeScript, full-project lint with zero warnings, and the normal Turbopack production build.
- Client-secret scan over **67 bundle files**, with no server-only variables or configured secret values found.
- Final patch-format checks and a visual review of phone/light and desktop/dark screenshots.

The main requested changes for wave 1 and this hero portion of wave 2 are complete and verified locally. Neither publishing-polish wave has been deployed. Production still runs the separate featured-description hotfix. This wave does not alter stored course data, access rules, payments or provider configuration.

## Manual acceptance before deployment

1. Open the homepage in light and dark modes on phone and desktop.
2. Check the full new introduction, the three benefits, and both buttons below them.
3. Confirm **كيف نختار الشارحين** reaches the process section and the browse button reaches the catalog.
4. Enable reduced motion in the operating system/browser, reload, and scroll through all sections; no section should remain invisible.
5. Confirm the previously deployed compact featured-course description remains intact.

No deployment was requested for this wave. Assemble the eventual release on production commit `d1ac7d7a16028eed5c5c792afb7270ec5a50b5e9` or newer, preserving earlier production fixes and excluding unrelated worktree history.

## Local React script warning follow-up

The raw executable theme script added to `app/layout.tsx` could trigger React's warning about scripts rendered on the client, for example during local rendering/refresh. Replaced that raw tag with Next.js's managed `Script`, using the same stable `elam-theme` ID and `beforeInteractive` strategy. The initializer itself and saved-preference behavior are unchanged. A template element would be inert and would not initialize the theme.

Verification: TypeScript, focused lint, all **24 theme tests**, and the normal production build passed. A real browser check of the running local Next.js sign-in page confirmed a saved dark preference, exactly one theme script and no script/hydration errors. Client-side navigation to registration retained dark mode and one script, with no errors. No account was submitted or created. Refresh an already-open local page once to discard the old warning; production has not been changed.
