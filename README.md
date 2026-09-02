# Elam

Arabic, right-to-left course platform built with Next.js App Router.

## Local development

1. Use Node.js `22.17.1` (see `.nvmrc` and `.node-version`).
2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local` and obtain approved local values. Never
   commit `.env.local`.
4. Start Docker Desktop, then start local Supabase with `npm run supabase:start`.
5. Start the application with `npm run dev`.
6. Open `http://localhost:3000`.

Use `npm run supabase:status` to inspect local endpoints and
`npm run supabase:stop` when the local stack is no longer needed. Use
`npm run supabase:reset` only against the local database.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:backend:coverage`
- `npm run build`
- `npm audit --audit-level=high`

Payment, video, and email integrations will be added in their corresponding
phases after their required provider decisions are resolved.

## Project planning

- [Project structure and team workflow](docs/architecture/project-structure-and-team-workflow.md)
- [Frontend roadmap](docs/roadmap/frontend-roadmap.md)
- [Backend roadmap](docs/roadmap/backend-roadmap.md)
- [Staging environment](docs/operations/staging-environment.md)
- [Server-only and secret handling](docs/security/server-only-and-secret-handling.md)
