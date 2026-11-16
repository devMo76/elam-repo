# Publishing polish — wave 6: footer and policies

## Scope and design plan

Publish the user's four-page `لائحة سياسات الخصوصية والاستخدام.pdf` as one HTML page at `/policies`, not an embedded or downloadable PDF. Keep its substantive clauses and ordering, with editorial headings for navigation. Repair PDF text-extraction artifacts by comparing against the rendered original. Normalize the brand to **إلام**, as requested in earlier waves. Do not invent dates, legal terms or operational promises.

Use the existing public header/footer, IBM Plex Arabic font, semantic theme colors and restrained violet rules. The document should be start-aligned in RTL, with comfortable line height, a readable text column and a contents list. On narrow screens the contents list comes before the text; on wider screens it is beside it. No animated entrance should delay access to policy text.

Footer: use the exact newly requested independence/course-content statement; replace the two inactive legal entries with one link to **لائحة سياسات الخصوصية والاستخدام**; expose the supplied support email and phone as real `mailto:` and `tel:` links. Isolate Latin contact values with LTR direction so the phone country code stays in order. No WhatsApp service is assumed.

## Implementation and verification

Implemented locally; **not deployed**.

Follow-up on 2026-11-16: removed the **معايير القبول** footer entry. The instructor column retains **اشرح مع إلام**.

- `/policies` uses `PublicShell` and the new `PolicyContent` server component, with a page-specific title and description. It is public and requires no sign-in.
- All four source pages are represented in 143 paragraphs under 11 editorial section headings. There is no PDF iframe, PDF dependency in the browser, new upload, or external document-hosting dependency.
- Policy data lives in `lib/policies.ts`; styling lives in `components/legal/PolicyContent.module.css`.
- Footer copy and contacts live in `lib/copy.ts`; `components/SiteFooter.tsx` renders a single policy link and isolated contact values with at least 44px link height.
- Footer statement: **إلام منصة مستقلة ومحتوى دوراتها يساعدك على فهم مقرراتك الجامعية وليس بديلا عنها**. This latest request supersedes wave 5's shorter footer statement; the FAQ independence answer remains unchanged.
- Support: `elam.support@gmail.com` and `+966 55 133 5720`, linking to `mailto:elam.support@gmail.com` and `tel:+966551335720`.
- Replaced the inactive platform/about/contact placeholders with the real contact column. The footer no longer contains separate terms and privacy entries.

## Source fidelity

Source SHA-256: `902a50dfd295ad76c4da60e9a40f04f18d8decef03ed8016949ebd15cd0cdafc`.

The original PDF is unchanged. Used local PyPDF extraction and compared all four rendered source pages to repair broken Arabic ligatures, incorrectly separated words and missing text. Restored the source's **مدى الحياة** sentence, which PyPDF omitted in part. Normalized punctuation and Arabic brand spelling; the source's business identifier, substantive conditions, retention period and refund periods are retained. The policy clauses about academic affiliation remain as supplied in the PDF; the marketing FAQ wording is separate. No legal reinterpretation or policy-enforcement/backend change was introduced.

| Source pages | Website sections |
| --- | --- |
| 1 | General terms, purchases, account use, content and ownership |
| 2 | Content continuation, service and liability, privacy |
| 3 | Privacy continuation, refunds, instructor terms |
| 4 | Instructor continuation, devices, rights, cookies and complaints |

## Checks completed

- TypeScript, repository-wide lint, patch-format checks and production build passed. The build includes `/policies`.
- All **7 affected browser checks passed**, including policy navigation and footer links at 320px, 390px and 1440px in both light and dark mode, with no horizontal overflow.
- Browser checks verify 11 sections, 143 paragraphs, representative source clauses, contents-anchor navigation, one unified policy link, correct support links and isolated LTR values.
- Visually reviewed the phone/light and desktop/dark policy screenshots and footer screenshots.
- Started a temporary local production server on port 3014: anonymous `GET /policies` returned **200**, `text/html; charset=utf-8`, all 11 section elements and both contact links, with no PDF embed. Stopped that temporary server afterward.
- Initial TypeScript checks identified an obsolete dead-link rendering branch and a shadowed browser-test variable; both were corrected, and checks/build rerun successfully.

## Manual acceptance

1. Open the homepage footer. Confirm the new statement and a single **لائحة سياسات الخصوصية والاستخدام** link.
2. Open that link and compare the policy text with the supplied PDF; confirm it is selectable website text and readable without sign-in.
3. Use the contents list to jump to privacy, refunds and instructor terms.
4. Click the support email and phone on a device configured for email/calls; confirm the correct address and number open.
5. Review the footer and policy page on phone and desktop in both themes. Confirm the phone starts with `+966` and contacts do not overflow.

No deployment, live data writes, payment behavior or automated policy-acceptance tracking changed in this wave.
