# Phase 1M — Lecturer Signup, Profile & RBAC E2E

Date: 2026-09-01  
Project: `my-project-51bb7`  
Final status: `PHASE_1M_STATUS = COMPLETE — OFFICIALLY CLOSED`

## Scope and guardrails

Phase 1M validated one controlled Lecturer test identity through the real Production signup and login paths, profile persistence, role and ownership controls, and the account block/unblock lifecycle. It did not start a Job, Application, Document upload/review, Interview, or Phase 2 workflow. Protected Super Admin, Limited Admin, and Recruiter identities were not changed.

No password, token, private key, or credential value is recorded in this document.

## Final account state

| Assertion | Result | Evidence |
|---|---|---|
| Firebase Auth identity exists | PASS | final read-only Phase 1M check |
| Firebase Auth enabled | PASS | `disabled=false` in final readback |
| Firestore profile exists | PASS | canonical `users/{authUid}` document |
| Role | PASS | `role=lecturer`; no Admin level, permissions, or Super Admin marker |
| Account status | PASS | `accountStatus=active`; not blocked |
| UID/profile linkage | PASS | Auth UID equals Firestore document ID; one matching profile and no duplicate account |
| Sensitive fields absent | PASS | no plaintext password, hash, salt, token, or private-key fields in the profile |

## Real workflow results

| Area | Result | Evidence / boundary |
|---|---|---|
| Lecturer signup | PASS | real `/signup` path created the Auth identity and canonical profile |
| Auth/profile creation | PASS | enabled identity and active `users/{authUid}` profile |
| Login | PASS | manual login reached `/lecturer-dashboard` |
| Dashboard | PASS | Lecturer modules rendered normally |
| Profile persistence | PASS | saved data remained after reload and final Production readback |
| Qualification | PASS | `education` persisted |
| Experience | PASS | one teaching-experience record persisted |
| Skills | PASS | two skills persisted |
| Academic relationship | PASS | the saved University → College → Department → Subject chain resolves with valid parent IDs |
| Trusted verification state | PASS | Lecturer could not persist profile-level verification; teaching experience remained pending and unverified |

## RBAC and ownership

Existing manual/runtime evidence confirmed that Lecturer Admin and Recruiter controls are absent, and direct access to `/admin-dashboard`, `/recruiter-dashboard`, and the tested Recruiter privileged route is denied or redirected. The targeted Demo Emulator suite previously passed 14/14 assertions for:

- safe self-profile fields and denial of role, `adminLevel`, permissions, and account-status mutation;
- protected verification fields;
- cross-user denial;
- ownership boundaries for applications, documents, interviews, ratings, and notifications;
- catch-all denial and blocked-session cutoff.

No security code changed after that targeted matrix; it was therefore not repeated during closure.

## Documents and notifications observations

| Area | Result | Observation |
|---|---|---|
| Documents page | PARTIAL | page and file picker opened; the 25 MB UI limit was visible. No upload, download, preview, review, or recruiter-notification workflow was executed in Phase 1M |
| Notifications | PARTIAL | page and empty state opened without permission errors after the signup initialization fix. No real notification event, unread transition, or entity deep link was exercised |
| Deep links | P1 OPEN | durable entity navigation for application/document/interview notifications remains incomplete and is intentionally deferred |

## Block, unblock, and audit

| Assertion | Result |
|---|---|
| Block through real Super Admin UI | PASS |
| Firebase Auth disabled while blocked | PASS |
| Firestore account status blocked | PASS |
| Existing Lecturer session denied/terminated | PASS |
| Lecturer Dashboard unavailable while blocked | PASS |
| Unblock through real Super Admin UI | PASS |
| Final Auth enabled and Firestore active | PASS |
| UID, email, role, profile, academic data, and password unchanged | PASS |
| Trusted block/unblock Audit Log entries | PASS |
| Audit entries contain no sensitive keys | PASS |

## Bugs and fixes

1. Signup created a Lecturer profile without explicit `accountStatus`, which was inconsistent with the active-account contract. The real signup now persists `accountStatus: 'active'`.
2. The notification listener could initialize before the new Firestore profile existed, receive a permission denial, and remain unavailable for the first session. After the profile write, signup now performs a full navigation to the Lecturer Dashboard so providers initialize against the completed profile. The notifications page then opened cleanly.

No unresolved Phase 1M blocker remains.

## Targeted verification and build

| Gate | Result |
|---|---|
| Final read-only Lecturer checker | PASS — Auth/profile/role/status/UID/profile data/academic links/audit assertions all true |
| Phase 1M targeted security evidence | PASS — 14/14 Demo Emulator assertions already completed; not repeated because the last change did not alter security policy |
| Production build | PASS — optimized build completed with known non-blocking ESLint, CRA `fs.F_OK`, and stale Browserslist-data warnings |

## Final decision

`PHASE_1M_STATUS = COMPLETE — OFFICIALLY CLOSED`

`REMAINING_P0 = 0`

Remaining P1 work is outside Phase 1M: notification/deep-link completion and automatic recruiter notification after document upload, Production File API/external-file ownership policy, dependency/toolchain modernization, removal of the legacy Admin fallback, trusted atomic audit mutations, and authenticated Cloud AI governance.

