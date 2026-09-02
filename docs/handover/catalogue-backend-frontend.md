# Catalogue backend/frontend handoff

## Backend entry points

Frontend Server Components import catalogue data from
`@/lib/catalogue/queries`:

```ts
const courses = await listPublishedCourses();
const course = await getCatalogueCourseBySlugOrNotFound(slug);
```

No browser-side fetch, API route, user ID, or service-role key is required.

## Stable response rules

- JSON/prop fields use camel case.
- Money is integer halalas and currency is always `SAR`.
- `durationSeconds` uses Western integer digits; formatting belongs in the UI.
- `isEnrolled` is calculated from the authenticated server session.
- `visibility` is `public` or `preview`; raw database status is not exposed.
- `modules` and `lessons` are returned in ascending `position` order.
- `durationSeconds: null` on a lesson means its duration is not known yet.
- A missing or unauthorized slug produces the same not-found result.

The canonical schemas and inferred TypeScript types are in
`lib/contracts/catalogue.ts`. Synthetic examples matching those contracts are in
`tests/fixtures/catalogue.fixture.ts`.

## Frontend integration sequence

1. In the catalogue Server Component, call `listPublishedCourses()` and pass
   each `CatalogueCourseSummary` to presentational course cards.
2. In the course route Server Component, await the route `params.slug` and call
   `getCatalogueCourseBySlugOrNotFound(slug)`.
3. Render modules and lessons directly from the ordered arrays.
4. Show the purchase action when `isEnrolled` is false; show the enrolled state
   when it is true.
5. Show a preview badge when `visibility === "preview"`.
6. Format `priceHalalas / 100` using `ar-SA-u-nu-latn` and `currency: "SAR"`.
7. Add route-level loading, error, and not-found UI in the frontend branch.

## Deliberately excluded

The contract never contains playable media URLs, provider asset IDs, learner
identities, instructor roles, order records, revenue, or raw publication status.
Playback and archived enrolled-course access begin in Backend Phase 4.
