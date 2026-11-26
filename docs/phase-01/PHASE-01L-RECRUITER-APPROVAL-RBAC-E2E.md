# Phase 1L — Controlled Recruiter Approval & RBAC E2E

Date: 2026-09-01  
Status: `COMPLETE — OFFICIALLY CLOSED`

## Scope and guardrails

Phase 1L validated the real Production Recruiter signup, pending-request, Super Admin approval/rejection, Auth provisioning, login, RBAC, ownership, block/unblock, and Audit Log paths on `my-project-51bb7`. It did not create lecturers, jobs, applications, documents, interviews, notifications, or ratings; it did not deploy Rules or begin Phase 2.

No password, ID token, password hash, service-account key, or other secret is recorded in this document.

## Recruiter01 real workflow

| Assertion | Result |
|---|---|
| Real Recruiter signup UI | PASS |
| Active university selector is dynamic | PASS |
| Request created once with `status=pending` | PASS |
| Password or equivalent secret field persisted in Firestore | NO — PASS |
| Staged Auth identity exists and is disabled before approval | PASS |
| Final active recruiter profile absent before approval | PASS |
| Super Admin Join Requests displays the request | PASS |
| Real approval enables the staged Auth identity | PASS |
| `users` profile has `role=recruiter`, `accountStatus=active`, and the canonical university ID | PASS |
| Request becomes `approved` with matching Auth linkage | PASS |
| Approval Audit Log exists without secrets | PASS |
| Duplicate approval is idempotent in the targeted Emulator contract | PASS |
| Real Recruiter login and dashboard | PASS |

The approved Recruiter01 account remains enabled and active for later separately approved workflow testing. Its UID, email, role, university relation, and Firestore profile remained stable through the account-status test.

## Recruiter UI and RBAC

The real Recruiter dashboard displayed the intended current modules:

- applications;
- document review;
- ratings;
- notifications;
- outbound notifications;
- interview management;
- position posting;
- published-position management;
- lecturer browsing.

No Admin accounts/permissions, academic CRUD, Super Admin, or Limited Admin controls were exposed in the Recruiter UI. `/admin-dashboard` is guarded by `ProtectedRoute requiredRole="admin"`; the live blocked-session test reached the Unauthorized screen, while the targeted Rules/API tests denied cross-role and cross-owner data access.

Targeted Demo Emulator evidence: 7/7 ownership/session tests passed for user-role mutation, recruiter application ownership, document ownership and immutable owner fields, interview relations, rating relations, notification ownership, and blocked-session cutoff. The earlier focused approval/rejection contract run passed 2/2, including duplicate-approval prevention and rejection cleanup.

## Recruiter01 block/unblock lifecycle

| Assertion | Result |
|---|---|
| Block through real Super Admin Accounts/Permissions UI | PASS |
| Firebase Auth becomes disabled | PASS |
| Firestore `accountStatus=blocked` | PASS |
| Existing session loses access | PASS |
| Recruiter Dashboard unavailable while blocked | PASS |
| Unblock through real Super Admin UI | PASS |
| Firebase Auth returns enabled | PASS |
| Firestore returns `accountStatus=active` | PASS |
| Correct post-unblock login can read the active Recruiter profile | PASS |
| Block and unblock Audit Log entries exist without secrets | PASS |

The block intentionally terminated the prior browser session. Unblock restored account availability but did not recreate that terminated session; fresh authentication is required by design.

## Direct RBAC bug fixed

During the blocked-session runtime test, authorization correctly reached the Unauthorized page, but the global Smart Assistant performed an uncaught role lookup after Firestore access was denied, causing the development error overlay to appear.

`src/components/shared/SmartAssistant.jsx` now treats a denied or unavailable role lookup as the safe `common` role, cancels stale async state updates on unmount, and avoids surfacing the expected blocked-user `permission-denied` as an uncaught runtime error. No authorization bypass was added.

Verification after the targeted fix:

- React tests: 8/8 PASS.
- Production build: PASS with pre-existing non-blocking lint/toolchain warnings.
- Production was not blocked again solely to retest a development-only overlay.

## Recruiter02 real rejection workflow

Recruiter02 was linked to `جامعة الأكاديمية النموذجية`, matching the planned second academic university.

| Assertion | Pending | After rejection |
|---|---:|---:|
| Request exists exactly once | PASS | PASS |
| Request status | `pending` | `rejected` |
| Canonical `universityId` relation | PASS | PASS |
| Plaintext password/secret field in request | NONE | NONE |
| Auth identity | staged and disabled | absent |
| Active recruiter `users` profile | absent | absent |
| Rejection Audit Log without secrets | N/A | PASS |
| Recruiter01 unaffected | PASS | PASS |
| Super Admin unaffected/protected | PASS | PASS |
| Limited Admin unaffected with exact final permissions | PASS | PASS |

Final controlled counts are Auth users `3`, Firestore users `3`, and Recruiter requests `2` (one approved and one rejected). Positions, applications, documents, interviews, ratings, and notifications remain empty.

## Notification and deep-link observation

Notification creation was not required by signup, approval, or rejection, and no notification document was created during this phase. The existing global badge merges receiver/legacy notification queries, but the Recruiter notifications page currently filters to rating and verification types and does not implement a generic click handler for a stored `deepLink`. Application/document/interview entity deep links therefore remain a P1 functional gap for a separate notification phase; they did not block the Recruiter account workflow.

## Audit integrity

Approval, block, unblock, and rejection events were written by the trusted Local File API/Super Admin path. Verification found no password, token, private key, or secret field in the relevant audit records.

## Exit gate

`PHASE_1L_STATUS=COMPLETE`. Recruiter01 is active, enabled, university-linked, login-capable, and retained for later E2E work. Recruiter02 remains a rejected request with no Auth identity or recruiter profile. Super Admin and Limited Admin remain unchanged. `REMAINING_P0=0`.

Final local checkpoint: `Academia-Smart-PHASE-01L-recruiter-approval-rbac-e2e-20260901-0327-WIP.zip`.
