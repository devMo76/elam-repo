# Publishing polish — wave 5: FAQs and teaching invitation

## Changes

- University-affiliation answer now says only **لا. إلام منصة مستقلة.**
- Instructor answer: **مجموعة متنوعة من الخريجين والطلبة المتميزين الذين لديهم الخبرة في المادة.**
- Quality question: **كيف أتأكد من جودة الشرح؟** Answer: **كل مادة تبدأ بدرس مجاني تستطيع مشاهدته قبل الاشتراك في الدورة.** Normalized the hamza spelling of الاشتراك.
- Removed the lecture-supplement question and answer, rather than leaving a question with no answer. Removed the same positioning and accreditation wording from the independence answer, footer and alternate FAQ copy.
- Removed the ratings FAQ for now. No rating calculation or backend behavior changed; reintroducing the question is deferred until requested.
- Teaching invitation now reads **كن شارحاً معنا** with **هل تملك المعرفة والقدرة على إيصال المعلومة؟** followed on a new line by **نعم، إذاً مكانك معنا في إلام**.
- Shared teaching CTA now reads **سجل كشارح**. Existing disclosure behavior and application-availability information remain unchanged; this copy update does not implement a new registration workflow.
- Updated alternate invitation copy to prevent old wording from returning through alternate designs.

## Files

`lib/copy.ts`, `lib/alternate-copy.ts`, `lib/alternate-two-copy.ts`, `components/sections/Faq.module.css`, and the existing homepage browser checks in `tests/browser/video-players.spec.ts`.

The invitation paragraph preserves the requested line break with `white-space: pre-line`. Existing semantic disclosures, layout, keyboard behavior and themes are retained.

## Verification

- TypeScript and repository-wide lint passed.
- All four affected browser checks passed, covering 320px, 390px and 1440px in light and dark themes, exactly three FAQ questions, updated answers, removed wording, footer copy and the teaching disclosure.
- Source scan across `app`, `components` and `lib` found no remaining lecture-supplement claims or removed ratings question. Historical documentation is retained as a record of earlier changes.
- The initial browser assertion counted the adjacent teaching disclosure as a fourth FAQ; corrected the test scope to count FAQ questions only and reran successfully.

## Manual acceptance

1. Expand each of the three FAQs and review its text.
2. Confirm the lecture-supplement and ratings questions are absent.
3. Check the footer states only that إلام is independent.
4. Review the adjacent teaching invitation on mobile and desktop; its two sentences should appear on separate lines.
5. Click **سجل كشارح** and confirm the existing availability disclosure still opens.

Implemented locally. **Not deployed.** Include with the pending polish waves after review.
