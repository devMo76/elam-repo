# Row-level security policy matrix

RLS is enabled on every application table. The service role bypasses RLS and is
restricted to trusted server operations; browser clients receive only the table
privileges and rows listed below.

| Table | Anonymous | Learner | Instructor | Administrator | Browser writes |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Instructor public profiles | Own + instructor public profiles | Own + instructor public profiles | All | Instructor public fields only; role changes use audited RPC |
| `platform_settings` | None | Read | Read | Read/update | Admin update is trigger-audited |
| `courses` | Published | Published | Published + owned | All | Instructor/admin authoring; no delete |
| `modules` | Published-course syllabus | Published-course syllabus | Published + owned-course syllabus | All | Course owner/admin |
| `lessons` | Published-course syllabus | Published-course syllabus | Published + owned-course syllabus | All | Course owner/admin |
| `orders` | None | Own | Own purchases only | All | None |
| `enrollments` | None | Own | Own enrolments only | All | None |
| `lesson_progress` | None | Own | Own | Own rows through RLS; reporting is separate | Own only |
| `admin_audit_log` | None | None | None | All | None; trusted database functions insert |

Important boundaries:

- Instructor access to another learner's order, enrolment, progress, or identity
  is denied. Counts-only instructor statistics are implemented separately and
  never expose money or learner identities.
- Course publication transitions are additionally constrained by database
  triggers and the live `instructor_direct_publish` setting.
- Orders and enrolments have no browser write privilege or write policy.
- Course, order, enrolment, setting, and audit records retain their existing
  deletion protections.
