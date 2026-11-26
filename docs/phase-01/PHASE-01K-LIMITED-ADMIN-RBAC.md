# Phase 1K — Limited Admin Creation & Production RBAC Validation

Date: 2026-09-01  
Status: `COMPLETE — OFFICIALLY CLOSED`

## Manual creation and read-only verification

The user confirmed that the real Super Admin UI created `limited-admin-phase1k@academia-smart.test` successfully and showed it as Active in Accounts/Permissions.

A subsequent Production read-only verification using the authorized Firebase CLI account confirmed:

| Assertion | Result |
|---|---|
| Firebase Auth identity exists | PASS |
| Firebase Auth identity enabled | PASS |
| Firestore `users` document exists | PASS |
| `role=admin` | PASS |
| `adminLevel=limited` | PASS |
| `accountStatus=active` | PASS |
| Exact permissions are `reports.view` and `audit.view` | PASS |
| Super Admin/wildcard/management permissions absent | PASS |
| `create_limited_admin` Audit Log exists | PASS |
| Audit target and granted permissions match | PASS |
| Audit writer is the trusted Local File API | PASS |
| Audit record contains password/secret/token/key fields | NO — PASS |

No Production write was performed by this verification.

## Scope

This phase covered the authenticated path used by the Super Admin UI to create and validate one approved Production Limited Admin. No Recruiter, Lecturer, workflow, academic, Rules, or unrelated Production data was created or changed.

The intended test identity remains `limited-admin-phase1k@academia-smart.test`, with exactly:

- `reports.view`
- `audit.view`

## Incident

The real Add Admin UI repeatedly returned the Arabic equivalent of `session invalid or expired` after a fresh Super Admin sign-in.

The failure had two contributing causes:

1. The frontend sent the normally cached Firebase ID token and had no bounded refresh path when a privileged API request received `401`.
2. The Local File API process had been restarted without its process-scoped Firebase Admin credentials. The backend authentication middleware grouped both `verifyIdToken` and the subsequent Firestore actor-profile lookup in one catch block, so an Admin/profile configuration failure was incorrectly reported as an invalid token.

## Request-flow findings

| Check | Result |
|---|---|
| Add Admin uses the shared API client | PASS |
| Frontend sends `Authorization: Bearer <Firebase ID token>` | PASS |
| API parses the same Bearer header | PASS |
| Client Firebase project matches `my-project-51bb7` | PASS |
| Firebase Admin project configuration matches the target project | PASS |
| CORS permits localhost:3015 and the Authorization header | PASS |
| Backend loads the actor profile after token verification | PASS |
| Backend trusts a client-supplied role | NO |
| Super Admin-only creation gate remains enforced | PASS |

No token, credential, private key, or sensitive configuration value was recorded.

## Targeted fix

### Frontend

`src/services/apiClient.js` now:

- obtains tokens from `auth.currentUser.getIdToken(false)`;
- retries an authenticated request once, and only once, after an HTTP `401`;
- obtains a fresh token for that retry through `getIdToken(true)`;
- verifies that the signed-in UID did not change between attempts;
- does not refresh/retry on `403` or other responses;
- applies the same behavior to protected-file requests.

### Backend

`server/index.js` now separates:

- missing Bearer credentials (`401 AUTH_REQUIRED`);
- failed/revoked/expired token verification (`401 INVALID_TOKEN`);
- actor-profile/Admin service failures (`503 AUTH_SERVICE_UNAVAILABLE`).

The existing account-status and RBAC checks were retained. There is no authentication bypass.

### Test coverage

- `src/services/apiClient.test.js`: 5/5 PASS.
  - cached valid token;
  - one forced refresh/retry after 401;
  - no infinite retry;
  - no refresh on 403;
  - missing signed-in user denied locally.
- Full Node security suite: 9/9 PASS.
- Phase 1K targeted Firebase Emulator security tests: 2/2 PASS on a Demo project.
  - missing token denied;
  - invalid token denied;
  - revoked token denied;
  - non-admin denied;
  - Limited Admin without the required privilege denied;
  - non-Super Admin denied even with `users.manage`;
  - valid Super Admin path creates the exact Limited Admin permissions in Emulator only;
  - protected Super Admin behavior remains unchanged.

## Runtime readiness

- Local frontend at `http://localhost:3015`: PASS.
- Local File API health: PASS.
- `adminCredentialsConfigured`: `true`.
- Firebase Admin initialization: PASS.
- Credentials remain outside the source project and are injected into the Local API process only.

## Production safety assertions

- Production writes during the initial token fix: `0`.
- Approved test Limited Admin created through the real UI: `YES`.
- Final Production Auth users: `2`.
- Final Production Firestore `users`: `2`.
- Limited Admin final Auth state: `enabled`.
- Limited Admin final Firestore state: `active`.
- Limited Admin final permissions: `reports.view`, `audit.view` only.
- Protected Super Admin changed: `NO`.
- Firestore Rules changed/deployed: `NO`.

## Current gate

The user confirmed a successful real sign-in as the new Limited Admin. Passwords remained outside chat.

## Final targeted RBAC validation

| Area | Assertion | Result |
|---|---|---|
| Login | Real Limited Admin login | PASS |
| Allowed UI | Academic Report and Audit Log tabs visible | PASS |
| Denied UI | Accounts/Permissions, Add Admin, join-request management, and academic-management tabs hidden without permission | PASS |
| Direct routes | Representative `/admin-dashboard/users` and `/admin-dashboard/universities` routes return the safe Not Found page | PASS |
| Data layer | Academic and audit reads allowed | PASS |
| Data layer | Create Admin, self-escalation, Super Admin mutation/block, and academic writes denied | PASS |
| Emulator | Phase 1K targeted RBAC/Auth suite | PASS — 3/3 |
| Live permission | Added only `requests.manage`; its tab appeared through the live Firestore profile listener without re-login | PASS |
| Permission restore | Removed `requests.manage`; exact final permissions returned to `reports.view` and `audit.view` | PASS |
| Block | Firestore status became blocked, Auth became disabled, and the active Limited Admin session returned to Login | PASS |
| Unblock | Firestore status returned to active and Auth returned to enabled | PASS |
| Session behavior | Unblock does not recreate a terminated browser session; a fresh login is required by design | EXPECTED |
| Audit integrity | Permission add/remove and block/unblock events exist, use the trusted Local File API/Super Admin actor, and contain no sensitive keys | PASS |
| Super Admin | Auth enabled, active Super Admin document retained and protected | PASS |

No additional RBAC bug was discovered during final validation. The previously fixed ID-token refresh and backend error-classification issue remained resolved.

## Exit gate

Limited Admin creation, Auth/Firestore verification, Audit Log verification, real login, UI/direct-route/data-layer enforcement, live permission refresh, block/unblock, and Super Admin protection have passed. `PHASE_1K_STATUS=COMPLETE`.

Official closure assertions: Limited Admin `active/enabled` with exactly `reports.view` and `audit.view`; Super Admin present, enabled, active, and protected; `REMAINING_P0=0`.

Final local checkpoint: `Academia-Smart-PHASE-01K-limited-admin-rbac-validated-20260901-0230-WIP.zip`. The ZIP excludes dependencies, build outputs, environment files, secrets, and sensitive Production backups.
