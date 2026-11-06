# Elam browser tab icon

Implemented locally on 2026-11-06; deployment is pending.

`app/icon.png` is an exact copy of the existing `public/elam-mark.png` book symbol used in the site header. Using the symbol alone keeps the brand recognizable at browser-tab sizes. The original logo files remain unchanged.

The installed Next.js app-icon file convention automatically emits the icon link from this root app asset, covering public pages and the learner, instructor, and admin dashboards. No custom icon route or external image dependency is required. Next.js generates the icon URL used in the document head.

Verification completed: SHA-256 file hashes match the header mark, and `npm run build` passed compilation, TypeScript, and static generation with `/icon.png` listed as a prerendered route (45 static pages).

After deployment, open the homepage and another route and confirm the tab shows the book symbol. If a browser retains its old favicon, close and reopen the tab or check a private window.
