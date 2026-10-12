# Catalogue title typography correction

Date: 2026-10-11.

The `/courses` card titles now explicitly use the site's IBM Plex Sans Arabic
stack and weight 600, matching the landing-page `PublishedCourseTile` titles.
Previously the CSS-module heading did not specify a weight, unlike the landing
card's `font-semibold` utility. Size, line height, card layout and content are
unchanged. No new font asset or dependency is added.

Verification: source comparison against the landing card and root font loading;
check the rendered catalogue against the landing page after deployment, including
long Arabic titles on mobile. No browser visual comparison or deployment is
claimed by this source-only correction.
