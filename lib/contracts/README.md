# Shared contract conventions

Files in this directory define data that may cross the backend/frontend boundary.

## Rules

1. Define the Zod schema first and infer its TypeScript type from that schema.
2. Validate untrusted data at the server boundary before using it.
3. Use `camelCase` for JSON fields. Database `snake_case` remains in the data layer.
4. Represent dates as ISO 8601 UTC strings.
5. Represent money as integer minor units. SAR amounts use halalas, never floating point.
6. Use stable, lower-snake-case machine error codes such as `already_enrolled`.
7. Return only messages that are safe for users; never expose secrets or stack traces.
8. Never return raw database rows from a public route.
9. Do not expose a database field merely because it exists.
10. Contracts must not import environment modules, database clients, or provider SDKs.
11. Backend and frontend reviewers must approve shared-contract changes.

DTOs are added when their feature phase begins. Phase 0 intentionally defines only
the standard API error response rather than guessing future response shapes.
