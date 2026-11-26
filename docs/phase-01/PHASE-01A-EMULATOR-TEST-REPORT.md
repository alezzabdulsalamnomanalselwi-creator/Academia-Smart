# Phase 1A — Firebase Emulator Security & Auth Validation

**التاريخ:** 2026-08-30  
**النطاق:** Firebase Authentication Emulator + Firestore Emulator + Local File API فقط.  
**Project ID:** `demo-academia-smart-phase1a` (demo project محلي؛ أي خدمة غير محاكاة تفشل بدل الوصول إلى Production).  
**الحالة النهائية:** `SECURITY_VALIDATED` محليًا. لا Rules deploy ولا migration ولا اتصال ببيانات Production.

## Environment and Repeatability

| Item | Actual |
|---|---|
| Node / npm | Node 24.19.0 / npm 11.17.0 |
| Firebase client | 11.10.0 |
| Firebase Admin | 14.3.0 |
| Rules test SDK | `@firebase/rules-unit-testing` 4.0.1 |
| Emulator CLI | `firebase-tools` 14.27.0 |
| Java | OpenJDK 17 من Android Studio JBR؛ صالح حاليًا، مع warning ترقية إلى Java 21 قبل `firebase-tools` 15 |
| Auth Emulator | `127.0.0.1:9099` |
| Firestore Emulator | `127.0.0.1:8080` |
| Re-run command | `npm run test:security:emulator` |

الإعداد في `firebase.json` و`.firebaserc` يستخدم demo project فقط. runner يضع cache/config في `%TEMP%`، ويختار Java 11+ دون credentials. بيانات الاختبار تُنشأ من بيئة Emulator فارغة لحسابات Lecturer A/B، Recruiter A/B، Limited Admin، Super Admin، وBlocked User.

## Executed Test Matrix

كل PASS أدناه ناتج عن assertion منفذ، وليس مراجعة نظرية.

| Test | Expected | Actual | Result | Evidence |
|---|---|---|---|---|
| Users — own read/safe profile update | allow | allowed | PASS | `emulator-security.test.js:159` |
| Users — role/permissions/adminLevel/status/blocked self mutation | deny | denied | PASS | `emulator-security.test.js:159` |
| Users — cross-user administrative mutation | deny | denied | PASS | `emulator-security.test.js:174` |
| Recruiter self role escalation | deny | denied | PASS | `emulator-security.test.js:174` |
| Limited Admin → Super Admin via Rules | deny | denied | PASS | `emulator-security.test.js:180` |
| Limited Admin → Super Admin via backend | `403 SUPER_ADMIN_PROTECTED` | exact response | PASS | `emulator-security.test.js:180` |
| Super Admin allowed academic action | allow | create/delete allowed in Emulator | PASS | `emulator-security.test.js:196` |
| Lecturer application create/read ownership | own allow, cross deny | matched | PASS | `emulator-security.test.js:202` |
| Recruiter application read/mutation ownership | own allow, cross/owner-change deny | matched | PASS | `emulator-security.test.js:214` |
| Document lecturer/recruiter ownership | related allow, cross deny | matched | PASS | `emulator-security.test.js:223` |
| Document ownership field mutation | deny | denied | PASS | `emulator-security.test.js:223` |
| Interview application/recruiter/lecturer relation | related allow, cross deny | matched | PASS | `emulator-security.test.js:238` |
| Ratings party access and immutability | related read; cross/update deny | matched | PASS | `emulator-security.test.js:251` |
| Notification own/cross read | own allow, cross deny | matched | PASS | `emulator-security.test.js:258` |
| Mark One / Mark All Read | only `read/readAt`; business fields unchanged | matched | PASS | `emulator-security.test.js:263` |
| Direct notification business mutation | deny `status/businessStatus/actionTakenBy` | denied | PASS after fix | `firestore.rules:233`, test `:278` |
| Trusted notification business action | authorized recruiter allow; lecturer deny | matched | PASS after fix | `server/index.js:539`, test `:285` |
| Recursive unauthorized collection read/write | deny | denied | PASS | `emulator-security.test.js:309` |
| Blocked Firestore access | deny with existing authenticated context | denied | PASS | `emulator-security.test.js:315` |
| Recruiter new request | pending; staged Auth disabled; no password-equivalent field | matched | PASS | `emulator-security.test.js:322` |
| Admin sees pending request | allow for Super Admin | allowed | PASS | `emulator-security.test.js:338` |
| Recruiter approval | Auth + users + active recruiter + universityId + audit | matched | PASS | `emulator-security.test.js:341` |
| Recruiter login after approval | success | succeeded | PASS | `emulator-security.test.js:360` |
| Double approve | idempotent; no duplicate Auth/users | duplicate response; user count unchanged | PASS | `emulator-security.test.js:362` |
| Existing email | clear safe conflict | `409 EMAIL_IN_USE` | PASS | `emulator-security.test.js:367` |
| Provisioning failure injection | no false success; pending retained; no privilege profile | `409 EMAIL_CONFLICT`; pending + disabled staged Auth | PASS | `emulator-security.test.js:379` |
| Recruiter rejection | rejected + audit; no Auth/profile/login | matched | PASS | `emulator-security.test.js:402` |
| Anonymous upload | deny | `401 AUTH_REQUIRED` | PASS | `emulator-security.test.js:432` |
| Valid authenticated PDF upload | allow | `201`, safe owner path | PASS | `emulator-security.test.js:432` |
| Invalid MIME / invalid extension | deny | `415 FILE_TYPE_NOT_ALLOWED` | PASS | `emulator-security.test.js:432` |
| File over 25MB | deny | `413 FILE_TOO_LARGE` | PASS | `emulator-security.test.js:432` |
| Path traversal filename | sanitize/contain | `test.pdf` under authenticated owner path | PASS | `emulator-security.test.js:432` |
| Cross-owner private file read | deny | `403 FILE_ACCESS_DENIED` | PASS | `emulator-security.test.js:432` |
| Missing file | structured Arabic response, no path/stack | exact `FILE_NOT_FOUND` contract | PASS | `emulator-security.test.js:432` |
| Blocked/paused same session | immediate sensitive-access cutoff | old token rejected `401 INVALID_TOKEN`; Rules denied; login `USER_DISABLED` | PASS | `emulator-security.test.js:483` |

## Command Results

| Command | PASS | FAIL | NOT_TESTED | Result |
|---|---:|---:|---:|---|
| `npm run test:security:emulator` | 21 | 0 | 0 | PASS |
| `npm run test:security` | 9 | 0 | 0 | PASS |
| `npm test -- --watchAll=false --runInBand` | 3 | 0 | 0 | PASS |
| `npm run build` | 1 build gate | 0 | 0 | PASS with existing ESLint/CRA/Browserslist warnings |

**Automated test total:** 33 PASS / 0 FAIL / 0 NOT_TESTED. Build gate PASS.

## Baseline Checkpoint

- **Name:** `Academia-Smart-PHASE-01A-pre-emulator-validation-20260830-1859-WIP.zip`
- **Path:** `C:\Users\mohammed\Documents\ChatGPT\مشروع التخرج\Academia-Smart-PHASE-01A-pre-emulator-validation-20260830-1859-WIP.zip`
- **SHA-256:** `195DE4E0361950C6A7558201795BC0124D1758488F69C2848507B09AEEB0712D`
- **Verified exclusions:** `.env`, secrets, `node_modules`, `build`, `dist`, `.git`.

## Bugs Found, Before/After

### P1 — Notification receiver could alter business state

- **Before:** first Emulator run: 18 PASS / 2 FAIL. The real security failure showed that a receiver could directly change `status` and `actionTakenBy` because `firestore.rules` allowed them.
- **Fixture correction:** the other failure used `accountStatus: active` over an already-active value, creating no changed key; it was corrected to a real `blocked` escalation attempt and then denied.
- **Fix:** notification client updates are restricted to `read/readAt`. Business actions use authenticated backend endpoint `/api/notifications/:notificationId/action`, with recruiter role, receiver ownership, action enum, and type allowlist checks.
- **After:** 21/21 Emulator tests PASS; direct business mutations deny and the authorized UI workflow remains functional through the trusted endpoint.

### P2 — Windows `.cmd` launcher incompatibility in runner

- Initial wrapper used `spawnSync(firebase.cmd)` and failed with `EINVAL`.
- Runner now invokes the installed Firebase CLI JavaScript entry with the current Node executable; subsequent runs PASS.

## Residual / Deferred Risks

- Rules are validated locally but intentionally **not deployed**. Production ruleset remains unchanged/unknown until a separately approved deployment gate.
- No production account, data, service-account credential, migration, or file reference was used.
- Dependency audit baseline remains open: 6 critical / 60 high from Phase 1. No audit fix or dependency-wide remediation occurred.
- Firebase CLI 14 warns that future CLI 15 requires Java 21; current tests pass on Java 17.
- External file providers and historical missing uploads remain outside Local File API ownership/migration scope.

## Final Decision

Phase 1 critical Auth/RBAC/ownership/File API controls are **`SECURITY_VALIDATED` in the local Emulator environment**. Checkpoint remains `WIP`, not `PASS`, because the general dependency security gate is still open and no Production deployment was authorized.
