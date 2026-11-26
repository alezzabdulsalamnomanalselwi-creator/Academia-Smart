# Phase 1D — Migration Manifest (Dry Run)

هذا الملف غير حساس ويحتوي counts/fields فقط. لا يحتوي full emails أو UIDs أو passwords أو tokens.

| Migration ID | Collection / scope | Affected count | Safe-auto count | Manual-review count | Fields | Risk | Deploy blocker |
|---|---|---:|---:|---:|---|---|---|
| M1A | recruiterRequests (rejected) | 1 completed | 1 | 0 | remove `password` | P0 / High | YES — remaining P0 is M1B |
| M2 | recruiterRequests + users + Auth metadata | 10 identity cases | 0 | 10 | `authUid`; possible users doc، `role`, `accountStatus` | High | YES |
| M3 | users + recruiterRequests | 11 documents | 0 | 11 | `universityId` | High | YES |
| M1B | recruiterRequests (approved) | 8 | 0 | 8 | remove `password` after reconciliation | P0 / High | YES |
| M4 | applications | 8 | 8 | 0 | `recruiterId` | Medium | YES |
| M5 | interviews | 9 | 3 | 6 | `applicationId`, `positionId`, `recruiterId`, optional `positionTitle` | High | YES |
| M6 | notifications | 17 | 4 | 13 | `receiver`, `userId`, `read`, `readAt`; preserve business `status` | Medium | YES for recipient rows |
| M7 | Firebase Auth + users | 2 | 0 | 2 | possible users doc or documented Auth disposition | High | YES |
| M8 | documents + ancillary file references | 41 references | 0 | 41 | file URL/storage reference fields | High | YES for file-service cutover |
| G1 | Rules/backend/routes/Admin UI/tests | 1 coordinated change set | 0 | 1 | remove legacy Super Admin fallback | High | YES |

Current readiness after SAFE operations only: `STILL_BLOCKED`.

## M1A Execution Record — 2026-08-31

M1A was separately approved and completed after the dry run. The Phase 1C Production backup was re-verified, then a limited sensitive before-image backup was stored only outside the project under `SENSITIVE-PRODUCTION-BACKUP`; its non-secret manifest checksum was verified. The single masked rejected request (`Z494y…UO9G`) was revalidated as `REMOVE_ONLY`: rejected, with no Auth/users linkage and no provisioning dependency. A single atomic Production commit removed only the `password` field and created a non-sensitive `adminLogs` audit entry. Readback confirmed the document and status remain, all non-sensitive fields are unchanged, and the field is absent. Historical password-field count is now `9 → 8`. No Auth, Rules, `.firebaserc`, source code, or other business data was changed.
