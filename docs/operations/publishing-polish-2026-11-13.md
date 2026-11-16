# Publishing polish — 2026-11-13

## 1. Homepage hero image

- Replaced the homepage hero's image source in `components/sections/Hero.tsx` with `/hero-campus.jpg`.
- Source supplied by the user: `C:\Users\znrab\Downloads\01.jpg`.
- Copied the image unchanged into `public/hero-campus.jpg`. Its SHA-256 matches the supplied original: `633686BB9FF54A2D5A1DCC2A02AA088CFF4EBD07AF66B312722F6D53A84301AE`.
- Retained the existing responsive frame, centered cover crop, and Next.js image optimization. The original file is a wide image; the existing 3:2 frame crops its sides.
- Verification: inspected the supplied image, verified matching source/destination hashes, and checked the source diff. No new automated tests are needed for this asset-only replacement.
- Release status: local change; not deployed.

## 2. First publishing-polish wave

### Requested scope and implementation order

1. Add a coherent night-mode toggle across public, learner, admin and instructor pages.
2. Use a bilingual browser tab title with a separator: **إلام | Elam**.
3. Use **إلام** for visible English brand-name occurrences, including the logo wordmark and teaching invitation.
4. Replace the tutor-selection heading/links with **كيف نعمل في المنصة**.
5. Standardize course terminology on **الدورات**, with the corresponding singular/possessive forms in course, learning, enrollment, purchase and empty/error states.
6. Remove the course/materials item from the primary desktop/mobile navigation. Retain the browse-courses CTA and footer link so the catalog remains accessible.
7. Verify functionality, readable contrast, small-screen layout and existing video workflows; document results before release.

### Design and behavior

- Preserve the indigo palette, Arabic IBM Plex type, existing layouts and rounded controls.
- A 44px moon/sun button in the public header and dashboard navigation exposes the selected state to assistive technology and supports keyboard activation. Dashboard drawer/phone controls are included.
- The initial theme follows the operating system. A deliberate choice is remembered under `elam.theme`, remains across page navigation/reloads, and synchronizes open tabs. Blocked browser storage must not prevent switching for the current session.
- A constant initializer is managed by Next.js `Script` with `strategy="beforeInteractive"` in the root layout. It restores the preference before hydration; Next manages script insertion and deduplication, while CSS provides the system-theme fallback. Only the root theme attribute has intentional hydration-warning suppression; the root layout does not read cookies or become dynamic solely for theming.
- Shared light/dark tokens cover text, surfaces, borders, controls, success/warning/error states and native browser form controls. Previously fixed light-only colors are replaced in auth, course and dashboard styles.
- The existing book-mark PNGs switch between light/dark variants. The visible wordmark is Arabic text in the site's typeface; source logo assets are preserved.
- The bilingual tab title is the intentional exception to the Arabic brand-name rule. Technical identifiers, domains, email addresses, storage keys and imported component names are preserved.
- Database course names/descriptions and instructor-authored content are not rewritten. The provider's hosted payment interface is outside the site's own theme styling.

### Verification and release

Verified in the original backend worktree:

- Typecheck and the normal Turbopack production build passed.
- **394 backend/theme tests passed across 74 files**, including first-paint preference resolution, blocked storage, and AA normal-text contrast for both palettes and semantic status colors.
- **25 browser tests passed**: system/manual themes, persistence across page loads, cross-tab synchronization, blocked storage using the browser's actual SecurityError type, keyboard operation, 320px/390px/1440px public headers, auth/learner/admin/studio surfaces, and existing preview/player/upload-status flows.
- Saved screenshots were reviewed for the dark homepage (including actual featured/catalog course components), authentication, admin review and instructor workspace. No horizontal page overflow was detected in the tested layouts.
- Focused and full-project lint passed with zero warnings. The rebuilt client-bundle scan passed for **67 files**, with no server-only variables or configured secret values detected. Final patch formatting checks passed.
- The expected checkout description assertion was updated to **طلب دورة إلام** plus the existing order ID. No payment amount, metadata, webhook or entitlement logic changed.
- Browser tests use local component fixtures and mocked provider/API responses; they do not send emails, charge cards, change permissions or modify real course data.

Manual checks before publication:

1. Switch themes from the homepage, reload, and navigate to sign-in, courses and the learner dashboard; verify the choice stays selected.
2. Open a second tab and verify changing its theme updates the first tab.
3. With a fresh browser profile, verify the initial theme follows the system preference.
4. On a phone, open the public and instructor menus, use the theme control, and check readability and spacing.
5. Check the Arabic wordmark in both themes and **إلام | Elam** in the browser tab.
6. Confirm **كيف نعمل في المنصة**, the teaching link, course terminology, and the absence of the duplicate materials navigation item. The browse CTA and footer catalog link should still work.
7. Inspect a course, its lessons and checkout in both themes. Course titles entered in the database remain unchanged.

This wave is local and **not deployed**. The original backend worktree contains earlier unreleased and historical branch changes; deployment must assemble this wave on the latest production commit instead of pushing that entire worktree blindly.

## Follow-up found during production hotfix verification

The featured-course description hotfix was deployed separately as `d1ac7d7a16028eed5c5c792afb7270ec5a50b5e9`; the original worktree includes the same fix. Rebase/assemble the future polish release on that version or newer.

**Resolved locally during wave 2:** `Reveal` now marks its wrappers with `data-reveal`. Under `prefers-reduced-motion: reduce`, the global stylesheet forces these wrappers to their final visible, untransformed state, including before JavaScript runs. This addresses the existing SSR case in which the motion library leaves server-rendered `opacity: 0` in place.

Regression coverage now starts with markup generated by the actual `Reveal` component through React server rendering. It verifies visibility while the client script is deliberately held back, after real React hydration, and with JavaScript disabled. Wave 1's requested implementation is complete locally; deployment and owner acceptance remain outstanding. See `publishing-polish-wave-2-hero.md` for the revised hero and final combined checks.
