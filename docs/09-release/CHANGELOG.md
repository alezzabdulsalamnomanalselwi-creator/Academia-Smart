# Academia Smart — Changelog

## 2026-09-05 — Phase 1W

- Added persisted Light, Dark, and System theme selection with operating-system preference support.
- Added centralized display-only bilingual status labels and responsive theme controls.
- Extended the approved visual system to authentication, dashboard shells, forms, tables, and Smart Assistant surfaces in dark mode.

## Phase 1V Smart Assistant Intelligence Upgrade — 2026-09-05

- Upgraded Smart Assistant from fixed guidance to role-, permission-, page-, and safe entity-aware Smart Local assistance.
- Added contextual quick suggestions, profile-completeness and unread-notification insights, safe troubleshooting answers, and UID-isolated conversation history.
- Preserved all deterministic AI scoring, ranking, compare, interview-question, and document-review-note behavior; Cloud remains optional and cannot change decisions or execute actions.
- Passed Smart Assistant 12/12, existing AI 13/13, and optimized CI build.

`PHASE_1V_STATUS=CODE_COMPLETE / MANUAL_ROLE_WALKTHROUGH_PENDING`; `REMAINING_P0=0`.

## Phase 1U Release Security & Durable File Storage Gate — 2026-09-04

- Reclassified CRA/Tailwind/startup tooling from Production dependencies to development dependencies.
- Updated compatible React Icons, Tailwind Forms, Autoprefixer, PostCSS, Concurrently, and Tailwind versions.
- Pinned patched `path-to-regexp` 0.1.13 and `websocket-driver` 0.7.5 transitive versions without a framework/Firebase major migration.
- Reduced the deployed/runtime `npm audit --omit=dev` result from 2 Critical / 28 High to 0 Critical / 0 High; documented nine remaining moderate rows separately.
- Retained CRA 5 and Firebase CLI findings as explicit development/build-machine risks rather than misrepresenting them as deployed runtime vulnerabilities.
- Evaluated Firebase/Google Cloud Storage: no bucket exists and secure bucket creation is blocked because the project has no active billing account.
- Rejected the existing Cloudinary configuration for private documents after authenticated validation returned 401; removed the temporary SDK and did not use a public/unsigned fallback.
- Preserved the Local File API, all existing local files, Document01, four role accounts, and the full JOB/Application/Document/Interview/Rating workflow.
- Passed React 51/51, server security 11/11, Production read-only integrity, and optimized CI build gates.

`PHASE_1U_STATUS=COMPLETE — GRADUATION_RELEASE_GATE_PASS / PUBLIC_STORAGE_DEFERRED`; `DEPENDENCY_RUNTIME_GATE=PASS`; `DURABLE_STORAGE_GATE=CONDITIONAL`; `DURABLE_STORAGE=SAFE_TO_DEFER_FOR_GRADUATION_DEMO`; `FINAL_PUBLIC_DEPLOY_GATE=NOT_READY`; `GRADUATION_LOCAL_DEMO_GATE=READY`; `REMAINING_P0=0`.

## Phase 1T Full UI/UX Visual Redesign & Final Polish — 2026-09-03

- Added a centralized academic SaaS design system with consistent color, type, spacing, surfaces, focus, motion, responsive, and RTL/LTR rules.
- Added shared bilingual authentication hero and role-dashboard shell components while preserving all routes, RBAC filters, callbacks, and workflow contracts.
- Redesigned Login, Lecturer/Recruiter Signup, password recovery/reset, Admin overview, Recruiter/Lecturer dashboards, profile, application progress, Smart Assistant, AI ranking/compare, dialogs, toasts, and global forms/tables/cards.
- Added real-data Admin role distribution and recent Audit activity; no fake operational data or Production writes were introduced.
- Added controlled authentication validation, accessible feedback/live regions, labelled dialogs/icon controls, visible keyboard focus, and reduced-motion support.
- Validated live Arabic/English direction and no horizontal overflow on available desktop/tablet surfaces; retained a physical 390px mobile rehearsal as a non-blocking follow-up because the in-app viewport floor was 768px.
- Passed all React tests 51/51, API/security smoke 11/11, and the optimized CI build. No business, Auth, Rules, data, ID, status, notification-routing, or AI decision contract changed.

`PHASE_1T_STATUS=COMPLETE`; `FULL_UI_UX_REDESIGN=PASS`; `REMAINING_P0=0`; existing public-release dependency/storage gates remain open.

## Phase 1S Final Regression & Release Readiness — 2026-09-03

- Revalidated the protected Super Admin, exact Limited Admin permissions, Recruiter01, Lecturer01, academic hierarchy, and complete JOB/Application/Document/Interview/Rating Production chain with zero scan writes.
- Confirmed zero orphan users/profiles/core workflow records, invalid owner IDs, or duplicate critical records.
- Passed the full React suite 51/51, server/API suite 14/14, Firestore/Auth Emulator security suite 25/25, anonymous Production denial probes, File API ownership matrix, and optimized CI build.
- Added explicit Published Jobs loading UX, per-user Smart Assistant session isolation, Limited Admin-aware help, and a pure Assistant knowledge test boundary.
- Removed stale debug/unused code and resolved CI ESLint blockers without changing workflow behavior.
- Synchronized only the existing TEST Limited Admin credential after local credential drift; UID, profile, role, exact permissions, and enabled/active state were preserved.
- Classified dependency modernization and durable public file storage as P1 gates before Internet release; did not run forced audit fixes or framework migrations.
- Retained two legacy notification read/status mismatches and the documented Cloud AI/lifecycle/product enhancements as safe graduation-demo deferrals.

`PHASE_1S_STATUS=COMPLETE`; `GRADUATION_DEMO_READY=TRUE`; `OVERALL_RELEASE_READINESS=96%`; `REMAINING_P0=0`.

## Phase 1Q Ratings & Post-Interview Evaluation E2E — 2026-09-02

- Completed Interview01 through the real Recruiter UI and retained the same deterministic Interview identity.
- Added one post-interview rating request tied to Recruiter01, Lecturer01, Application01, Interview01, and JOB-01; duplicate request creation is blocked.
- Replaced client-supplied/random rating writes with a trusted authenticated API, deterministic one-per-Interview rating identity, integer 1–5 validation, and atomic request resolution/result notification.
- Added exact Recruiter request and Lecturer result deep links, Arabic event content, explicit unread/readAt semantics, and Lecturer score/comment/date visibility.
- Deployed the targeted Firestore Rules hardening that denies direct client creation of ratings and rating event notifications; retained a sensitive local rollback source and verified deployed/local SHA equality.
- Passed rating unit 3/3, API-negative 5/5, focused Emulator 2/2, routing 14/14, real Production readback, and optimized build gates.
- Retained the current `interview_scheduled` Application status after Interview completion and the absence of global/Admin rating analytics as P1 gaps.

`PHASE_1Q_STATUS=COMPLETE`; `REMAINING_P0=0`.

## Phase 1P Interviews & Interview Notification Deep Links — 2026-09-02

- Scheduled one real Production online Interview01 for Application01 and atomically transitioned the Application to `interview_scheduled`.
- Added deterministic Interview identity and friendly duplicate prevention; the real second-schedule attempt was denied and count remained one.
- Added the Lecturer `مقابلاتي` view, localized interview status/details, and exact entity deep links for scheduled, rescheduled, and status event aliases.
- Rescheduled Interview01 through the real UI without changing its ID; Lecturer received and opened the new schedule notification.
- Preserved explicit `read/readAt` semantics; opening events did not mutate Interview01 or Application01 business states.
- Replaced a Rules-incompatible nonexistent-document transaction read with a Rules-compatible atomic batch.
- Replaced native segmented date/time fields with custom-validated Arabic-friendly formatted inputs.
- Passed 20/20 scheduling/routing tests, 11/11 local security tests, 3/3 focused Demo Emulator tests, Production readback, and optimized build.
- Retained global cross-Recruiter conflict detection and strict server/Rules lifecycle transitions as P1. Cancel/complete/no-show were validated locally only so Interview01 remains future/rescheduled for the next phase.

`PHASE_1P_STATUS=COMPLETE`; `REMAINING_P0=0`.

## Phase 1O Documents, Notifications, AI Review Note & Deep Links — 2026-09-02

- Completed one real Production Lecturer document upload and Recruiter approval with correct Lecturer/Recruiter/Application/Position ownership and a persisted human-edited review note.
- Added deterministic `document_uploaded`, `document_approved`, and `document_rejected` contracts with target IDs, idempotency keys, Arabic labels, and entity deep links.
- Made Recruiter and Lecturer dashboards honor section/document query parameters and display the exact linked document/result.
- Added explicit `read/readAt` behavior for click and Mark All Read; removed render-time auto-read and preserved business state.
- Added authenticated protected-file viewing; verified owner and assigned Recruiter access plus anonymous/unrelated denial.
- Added an editable advisory Hybrid AI Document Review Note with optional Cloud use and a verified Local fallback; AI never saves or decides automatically.
- Passed targeted frontend 14/14, local security 10/10, Demo Emulator 6/6, real Production readback, and optimized build gates.
- Retained legacy notification normalization, Cloud AI governance, producer hardening, and remaining Interview deep links as P1. No Rules deploy, Interview, Rating, Auth mutation, Git/GitHub, or Phase 2 work occurred.

`PHASE_1O_STATUS=COMPLETE`; `REMAINING_P0=0`.

## Phase 1N Jobs & Applications E2E — 2026-09-01

- Published one real Production JOB-01 with a valid owner, hierarchy, deadline, employment type, open state, and exactly one matching record.
- Uploaded a non-sensitive synthetic CV through the real Lecturer profile uploader and completed one real Application01 submission.
- Added deterministic application identity and canonical university/timestamp fields; duplicate UI and Production counts remain exactly one.
- Completed Recruiter review and persisted `pending → under_review`; Lecturer Track Applications displays localized `قيد المراجعة`.
- Corrected the Post Position submit-state race, the Manage Positions employment-type mismatch, the Lecturer status display/filter, and stale applicant-count presentation.
- Passed focused application ownership/immutability tests 2/2 on Demo and the optimized Production build with known non-blocking warnings.
- Verified exactly three workflow notifications (`new_position`, `application`, `application_status`) with correct recipients and unique event keys; fresh events started unread.
- Retained entity Deep Links, Recruiter application-notification visibility, and the render-time `read=true`/`status=unread` mismatch as P1; no Interview, Document Review, Rating, Auth, Rules, Git/GitHub, or Phase 2 work occurred.

`PHASE_1N_STATUS=COMPLETE`.

## Phase 1M Lecturer Signup, Profile & RBAC E2E — 2026-09-01

- Completed real Production Lecturer signup, Auth/profile creation, login, Dashboard access, and final enabled/active UID-linked readback without plaintext secrets or duplicate accounts.
- Persisted and verified qualification, one teaching experience, two skills, and a valid University → College → Department → Subject relationship while retaining pending/untrusted verification state.
- Validated Lecturer cross-role UI/direct-route denial and retained 14/14 targeted Demo Emulator assertions for protected fields, ownership, catch-all denial, and blocked-session cutoff.
- Added explicit `accountStatus: active` to Lecturer signup and fixed the first-session notification-listener race by reinitializing the application only after the profile write.
- Completed real Super Admin block/unblock, session denial, final access readiness, and trusted non-sensitive Audit Log verification for Lecturer01.
- Classified Documents and Notifications as partial observations; no upload/review/event/deep-link workflow was claimed. Durable deep links and document-upload recruiter notification remain P1.
- Final read-only Phase 1M checker passed, and the optimized Production build passed with known non-blocking warnings.
- Officially closed Phase 1M: `PHASE_1M_STATUS=COMPLETE — OFFICIALLY CLOSED`, `REMAINING_P0=0`.

## Phase 1L Recruiter Approval & RBAC E2E — 2026-09-01

- Completed Recruiter01 signup through the real Production UI, verified a single pending request with no plaintext password, and confirmed the current staged Auth contract uses a disabled identity before approval.
- Approved Recruiter01 through the real Super Admin Join Requests UI; verified enabled Auth, an active `role=recruiter` Firestore profile, canonical university linkage, approved request/Auth linkage, and a secret-free trusted Audit Log.
- Completed real Recruiter login and dashboard validation; Admin controls are absent and route/data protections remain enforced.
- Passed focused Demo Emulator approval/rejection tests 2/2 and recruiter ownership/blocked-session tests 7/7.
- Completed the real Recruiter01 block/unblock lifecycle: active access was cut off, Auth/Firestore became disabled/blocked, then returned to enabled/active and accepted a correct fresh login.
- Fixed the blocked-session development overlay by catching the Smart Assistant role lookup denial and falling back safely; React tests passed 8/8 and the Production build passed with existing warnings.
- Completed Recruiter02 signup and rejection through the real Production UI: the rejected request remains, the staged disabled Auth identity was removed, no recruiter profile exists, and the rejection Audit Log contains no secrets.
- Preserved Recruiter01, the protected Super Admin, and the exact Limited Admin permissions. Final Auth/users counts are 3/3; jobs, applications, documents, interviews, ratings, and notifications remain empty.
- Retained the known P1 notification/deep-link gap for a separate phase; no notification document was created by the Recruiter account workflow.

### Guardrails

- No Lecturer workflow, Job/Application workflow, Rules deployment, academic mutation, Super Admin/Limited Admin mutation, Git/GitHub action, or Phase 2 work occurred.

## Phase 1K Limited Admin RBAC Validation Complete — 2026-09-01

- Completed real UI creation and login for the Limited Admin with exactly `reports.view` and `audit.view`.
- Verified Auth enabled state, active Firestore profile, absence of Super Admin permissions, and a secret-free trusted creation audit.
- Verified Reports/Audit visibility, management-tab hiding, safe direct-route rejection, and data-layer denial for Admin creation, privilege escalation, Super Admin mutation, and academic writes.
- Extended the Phase 1K Emulator suite; all 3 targeted RBAC/Auth tests passed.
- Added `requests.manage` temporarily and observed the join-request tab appear through the live profile listener without re-login; then removed it and restored the exact original permissions.
- Blocked only the test Limited Admin, confirmed its active session returned to Login, then unblocked it and confirmed Auth enabled/Firestore active state.
- Verified trusted Audit Log entries for permission add/remove and block/unblock with no password, token, key, or secret fields.
- Preserved the protected Super Admin unchanged.
- Officially closed Phase 1K with the Limited Admin active/enabled on exactly `reports.view` and `audit.view`, the Super Admin present/enabled/protected, and `REMAINING_P0=0`.

### Guardrails

- No password change, account deletion, additional permission, Recruiter/Lecturer workflow, Rules deployment, Git/GitHub action, or Phase 2 work occurred.

## Phase 1K Limited Admin Auth-path Fix — 2026-09-01

- Traced the real Add Admin request from the React UI through the shared API client, Local API Bearer parsing, Firebase Admin verification, actor-profile lookup, and Super Admin-only gate.
- Added one bounded forced-token refresh/retry after an authenticated request receives `401`; no retry occurs on `403` and the signed-in UID must remain unchanged.
- Separated invalid-token responses from Firebase Admin/actor-profile availability failures so server configuration problems are no longer presented as an expired user session.
- Added targeted frontend and Emulator security coverage for missing, invalid, revoked, non-admin, Limited Admin, and valid Super Admin cases.
- Passed 5/5 API-client tests, 9/9 security tests, and 2/2 Phase 1K targeted Emulator tests.
- Restarted the frontend and Local API with secure external Firebase Admin credentials; frontend and API health checks pass and `adminCredentialsConfigured=true`.

### Guardrails

- No Production write, Auth-user creation, Super Admin change, Rules deployment, Git/GitHub action, or downstream workflow was performed. Manual Add Admin retry is the next gate.

## Phase 1J Controlled Production Academic Seed — 2026-08-31

- Completed the approved Production academic baseline on `my-project-51bb7`: 2 universities, 3 colleges, 4 departments, and 6 subjects (15 documents total).
- Used one atomic Firestore commit with `exists:false` guards, real parent IDs, active records, and a local execution manifest containing no secrets.
- Passed post-seed relationship/code/status/orphan/duplicate verification and Production idempotency readback (`0` new, `15` skipped).
- Preserved the protected Super Admin/Auth and `users=1`; no Auth identities, recruiter requests, jobs, applications, documents, interviews, ratings, notifications, Rules, or configuration were changed.
- No rollback was required. Electrical engineering uses the approved current `SUB101` fallback and remains a future code-generator improvement.

### Guardrails

- No workflow/account seed, Firebase Auth mutation, Rules deployment, `.firebaserc` change, Git/GitHub, or Phase 2 work.

## Phase 1I Academic Seed Executor Build & Review — 2026-08-31

- Added a guarded, idempotent 15-record academic baseline executor with explicit `--dry-run`, `--verify`, emulator-only `--execute`, and manifest-bound emulator-only rollback modes.
- Matched current academic data fields and relationships; subject data stores only `departmentId` and `code`, without redundant university/college IDs or seed-marker fields.
- Added normalized parent-scoped duplicate protection, subject-code conflict protection, a read-only verifier, and a future local execution-manifest design with no secrets.
- Added a Demo-only Emulator harness for execute, verify, second-run idempotency, rollback/reseed, and Super Admin rules compatibility.
- Local syntax, Help, Dry Run, and Production execution guard passed. The Demo-only Firestore/Auth Emulator harness also passed: 15 initial records, verify, idempotent second run, manifest-bound rollback with unrelated-record retention, reseed, and Rules runtime compatibility.
- Resolved the local Emulator incident by reusing the official default cache after validating its expected size/SHA and isolating the CLI config path. The installed JDK 17 is compatible with the current CLI; the Java-21 message is a future maintenance warning.

### Guardrails

- No Production Seed, Firebase Auth/Firestore mutation, Rules deployment, migration, `.firebaserc` change, Git/GitHub, dependency upgrade, or Phase 2 work.

## Phase 1H Plan Only — 2026-08-31

- Added a fictional, clean 2/3/4/6 academic baseline proposal and a workflow-first E2E plan for Limited Admin, two recruiters, and three lecturers.
- Chose real UI workflows for accounts, jobs, applications, documents, interviews, ratings, notifications, and audit evidence; only the 15 academic baseline records are proposed for future controlled seed execution.
- Added the future execution manifest shape, protected Super Admin cleanup constraints, 18 E2E scenarios, 15 RBAC assertions, and 10 notification/deep-link checks.
- Added an as-is AI audit: 8 implemented, 5 partial, and 2 missing features; no AI feature was changed or invoked.
- Recorded planning findings for the missing seed executor, document notifications/deep links, and Cloud AI boundary.

### Guardrails

- `PLAN ONLY`: no Production Firestore/Auth write, Seed execution, file upload, Rules deployment, migration, `.firebaserc` change, Git/GitHub, or Phase 2 work.

## Phase 1G Complete — 2026-08-31

### Controlled Production Firestore Rules Deployment

- Revalidated the exact Production target، authorized CLI account، absence of Emulator targeting، verified Phase 1F restore backup، and protected Super Admin assertions.
- Captured the previously active Production Rules in the separate sensitive backup area for immediate rollback; old Rules SHA-256: `9B8C04446F4D7FE4B19F36807C79A56FC2A8882467E92752FFFFE83F335FD0A9`.
- Passed the Phase 1G pre-deploy security suite (30/30) and Production build; retained known non-blocking CRA/ESLint/Browserslist warnings.
- Deployed only `firestore:rules` to `my-project-51bb7` using the explicitly selected account; no other Firebase component was deployed.
- Read back the active ruleset and confirmed an exact normalized match with local Rules SHA-256 `F7203F6A38BB7060AE1C14903890477C630870AC9B434BE01DA42D68A15FBBA7`.
- Confirmed anonymous reads of users، adminLogs، and an arbitrary collection are denied; an anonymous arbitrary write authorization check is also denied without creating data.
- Completed manual/read-only UI smoke: Super Admin login، Dashboard، Accounts/Permissions، Audit Log، empty Join Requests، and empty Academic Report all PASS with no unexpected Permission Denied.
- Preserved the clean Production state: Auth/users 1، adminLogs 86، and all reset-target collections 0.
- Closed both P0 categories: public Firestore access and historical plaintext passwords. `REMAINING_P0=0`; no rollback was required.

### Guardrails

- No Seed Data، Firebase Auth mutation، Production data mutation، migration، other Firebase deploy، `.firebaserc` change، Git/GitHub، dependency upgrade، or Phase 2 work.

## Phase 1E Production Reset — 2026-08-31

### Controlled Test-data Cleanup

- Revalidated the immutable local backup and exact live Production document/UID sets before deletion.
- Deleted 208 approved Firestore test documents in dependency order with update-time preconditions and stage readbacks.
- Deleted 13 approved non-protected Firebase Auth identities; preserved the enabled Super Admin UID and matching users document.
- Preserved all 85 existing `adminLogs` and added one non-sensitive reset summary audit record؛ final count 86.
- Verified all recruitment، activity، academic، and test identity target collections are clean؛ Firestore users 1 and Auth users 1.
- Verified historical plaintext-password records are 0.
- Retained the external-reference inventory and deleted no external/local file object.

### Guardrails

- No Seed Data، Firestore Rules deploy، password reset، `.firebaserc` change، migration، Git/GitHub، dependency fix، or Phase 2 work.

## Phase 1F WIP — 2026-08-31

### Verified Production Backup & Restore Readiness

- Created a new local-only sensitive Production backup outside the source tree.
- Recursively exported raw Firestore typed JSON and verified 294 Production documents against 294 backup documents across all discovered/expected collection paths.
- Exported all 14 Firebase Auth accounts with the official CLI; verified 14 unique UIDs، protected Super Admin presence، and checksum integrity without exposing hashes/salts.
- Verified the protected Super Admin users document and all 85 admin logs in the Firestore backup.
- Snapshotted 44 local/external file-reference metadata fields without downloading or deleting files.
- Passed password-compatible Auth restore on a demo Emulator for 14/14 accounts: hashes/salts and protected SCRYPT configuration imported successfully; original UIDs، email/disabled/provider metadata، and Super Admin presence passed. No password login was attempted without a safe test credential.
- Installed verified portable Microsoft OpenJDK `21.0.12.1 LTS` outside the source tree for Emulator-process use only; retained the system Java `1.8.0_05` unchanged.
- Passed local Firestore Emulator full restore: 294/294 documents، every collection-path count and raw typed field matched، Super Admin users document present، and adminLogs 85/85.
- Updated the sensitive backup manifest with restore results and checksum only; no SCRYPT value was recorded in documentation or console output.

### Readiness and Guardrails

- Final status: `RESTORE_READY_FOR_TEST_DATA_RESET`; all restore-readiness gates pass locally. Test Data Reset remains blocked until separate explicit approval.
- No Production document/Auth/file mutation، Rules deploy، reset، seed، `.firebaserc` change، dependency fix، Git/GitHub operation، or Phase 2 work.

## Phase 1E WIP — 2026-08-31

### Test Data Reset Dry Run

- Revalidated one explicit protected Super Admin across Firebase Auth and Firestore users; UID/document ID match، role/adminLevel/permissions/status are valid، and deletion-candidate count is zero.
- Discovered and counted all current Production root collections: 14 Auth users and 294 Firestore documents.
- Classified 208 Firestore test documents and 13 non-protected Auth users as future deletion candidates; retained the protected identity and 85 administrative audit records.
- Designed child/leaf-first delete order، clean target state، synthetic seed dataset، E2E validation، audit retention، file-reference handling، and rollback gates.
- Verified the existing source/full/sensitive backups and checksums. Destructive execution remains blocked until a fresh current Firestore snapshot and restorable Auth export exist.

### Guardrails

- `DRY_RUN_ONLY`: no document/Auth/file deletion، update، disable، Rules deploy، `.firebaserc` change، source-code change، Git/GitHub operation، migration، or Phase 2 work.

## M1A WIP — 2026-08-31

### Historical Sensitive-Field Cleanup

- Re-verified the Phase 1C Production backup and created a limited sensitive local before-image backup outside the project, with a verified non-secret manifest checksum.
- Revalidated and updated exactly one rejected `REMOVE_ONLY` `recruiterRequests` record: deleted only its historical `password` field.
- Readback confirmed the document remains, status and all non-sensitive fields are unchanged, the field is absent, and the historical password-field count changed from `9` to `8`.
- Created and read back a non-sensitive administrative audit entry for `historical_sensitive_field_cleanup`; no password value was logged.

### Scope

- M1A is complete. M1B, recruiter reconciliation, Auth changes, Rules deployment, all other data migrations, source-code changes, `.firebaserc` changes, Git/GitHub, and Phase 2 remain unexecuted.

## Phase 1D WIP — 2026-08-31

### Production Remediation Dry Run

- Re-verified the Phase 1C source checkpoint and 292-record sensitive Production backup, including every available checksum.
- Re-read current Firestore/Auth state without writes and produced masked password، recruiter، application، interview، notification، Auth-orphan، and file-reference matrices.
- Classified 8 application ownership backfills and 3 interview relationship backfills as safe; retained 4 interviews as ambiguous and 2 as orphan.
- Identified 4 safe notification normalizations and 13 rows requiring a historical `readAt` policy; business status remains protected.
- Confirmed one explicit Super Admin، zero legacy data candidates، and legacy fallback logic still present in Rules/backend/routes/Admin UI.
- Created a non-sensitive migration manifest and dependency/rollback/validation order.

### Decision and Guardrails

- Readiness after SAFE migrations only: `STILL_BLOCKED`.
- No Production/Auth mutation، password cleanup، migration، Rules deploy، source-code change، Local File API change، `.firebaserc` change، dependency fix، Git/GitHub، or Phase 2 work.

## Phase 1C Complete (WIP checkpoint) — 2026-08-30

### Production Safety Foundation

- Created and verified a local pre-remediation source checkpoint with SHA-256.
- Exported all discovered Firestore root collections plus required empty collections to a separate local-only sensitive backup; 292 documents across 17 collection paths with per-file checksums and a verified manifest.
- Identified one unambiguous enabled legacy admin and one separate explicit Limited Admin.
- Atomically added `adminLevel=super`, `permissions=['*']`, and `accountStatus=active` to the legacy admin using a backup-matched `updateTime` precondition.
- Atomically created and read back one deterministic Phase 1C audit record.
- Confirmed Firebase Auth identity exists and is enabled; no Auth or Custom Claims mutation occurred.
- Re-ran security regression: Node 9/9، Emulator 21/21، React 3/3 PASS.

### Completion Gate

- Manual browser login on `http://localhost:3015` succeeded. Admin Dashboard and Accounts/Permissions opened, and `admin@system.com` appeared as a protected Super Admin.
- Break-glass status: `BREAK_GLASS_READY`.
- At the Phase 1C checkpoint، Production Firestore Rules still allowed public full CRUD and local protection was not yet deployed; Phase 1G subsequently closed this P0.
- Phase 1 remains WIP because historical password handling، recruiter reconciliation، ownership/interview backfills، Auth orphans، File API Production configuration، Rules deployment، and dependency remediation are still open.

### Guardrails

- No Rules deploy، `.firebaserc` change، password cleanup، recruiter reconciliation، ownership backfill، file migration، Phase 2، Git/GitHub، or dependency upgrade/audit fix.

## Phase 1B WIP — 2026-08-30

### Production Readiness (Read Only)

- Verified access to `my-project-51bb7` using the explicitly selected Firebase CLI account without changing `.firebaserc`.
- Read the active Firestore ruleset and confirmed a P0 public `allow read, write: if true` catch-all.
- Counted Firestore schema compatibility and Firebase Auth metadata without modifying Production or exposing credentials/password values.
- Confirmed 9 historical recruiterRequests with a password field, no explicit Super Admin, 8 approved requests without usable accounts, 8 applications without recruiterId, 6 interviews without recruiterId, and 2 Auth identities without users documents.
- Reviewed React query compatibility and File API configuration locally; no source code changed.
- Decision: `C. MIGRATION_REQUIRED_BEFORE_DEPLOY`.

### Guardrails

- No Rules deploy، Firestore/Auth write، Custom Claims change، migration، Git/GitHub، or Phase 2 work.

## Phase 1A WIP — 2026-08-30

### Emulator Validation

- Added local-only Firebase configuration for Authentication and Firestore Emulators under demo project `demo-academia-smart-phase1a`.
- Added a reusable Java/CLI runner and `npm run test:security:emulator` / `npm run test:security:all` commands.
- Added deterministic local fixtures for Lecturer A/B, Recruiter A/B, Limited Admin, Super Admin, blocked account, and related recruitment entities.
- Added 21 Emulator/integration tests covering Rules, Auth, recruiter provisioning, RBAC, ownership, notifications, blocked sessions, and Local File API.

### Phase 1 Security Fixes from Runtime Evidence

- Restricted notification receiver writes in Firestore Rules to `read/readAt` only.
- Added trusted `/api/notifications/:notificationId/action` endpoint with role/receiver/type/action validation.
- Updated Recruiter Notifications to use the trusted endpoint for business actions.

### Validation

- Emulator matrix: 21/21 PASS after fix (initial run 18/20 exposed the notification rule issue plus one corrected no-op fixture assertion).
- Existing Node security tests: 9/9 PASS.
- React tests: 3/3 PASS.
- Production build: PASS with existing warnings.
- Phase status: `SECURITY_VALIDATED` locally; WIP checkpoint retained due the open dependency gate.

### Guardrails

- No Firebase Production connection or Rules deploy.
- No data/file migration, Git/GitHub, `npm audit fix`, or `npm audit fix --force`.

## Phase 1 WIP — 2026-08-30

### Security

- Replaced Firestore authenticated catch-all with deny-by-default collection rules.
- Added ownership/RBAC enforcement and protected security fields/Super Admin.
- Added Firebase Admin backend for recruiter requests, approval/rejection, limited-admin creation, user security updates, profile verification decisions.
- Stopped Firestore plaintext password storage for all new recruiter requests.
- Added disabled staged Auth users, compensation, request state/attempt IDs, deterministic critical audit entries, approval read-back.
- Added real-time role/status enforcement and refresh-token revocation for privileged status changes.

### File Service

- Added Firebase ID token auth and relationship-based read authorization.
- Added 25MB cap, multipart limits, extension/MIME/magic validation, path containment, sanitization, rate limiting, strict production CORS behavior.
- Added safe health and structured missing-file responses.
- Updated React local file upload/preview to send tokens.

### Data Integrity

- Restricted applications/documents/interviews/ratings/notifications/verifications by ownership.
- Added `recruiterId` to new applications and aligned recruiter queries with owned positions.
- Protected teaching verification fields through backend sanitization and transaction decisions.
- Mark All Read no longer changes business status.
- Notification event IDs are deterministic SHA-256 keys for callers using the shared helper.

### Dependencies

- Added `firebase-admin@14.3.0`.
- Upgraded `multer` to 2.3.0.
- Updated within same major: Express 4.22.2, Firebase 11.10.0, React Router DOM 7.18.3.
- Synchronized `package-lock.json`; no `npm audit fix` or force operation used.

### Tests

- Added 9 Node security tests and 3 Jest file validation tests.
- Production build succeeds with warnings.
- Firebase Emulator/Auth integration remains NOT_TESTED, so release status is WIP, not PASS.

### Migration

- No Firestore/Auth/file migration or cleanup executed.
- Added dry-run plan for legacy passwords, requests, admins, relationships, and file references.
## 2026-09-02 — Phase 1R

- Added deterministic, bounded candidate match scoring with auditable factor breakdown and profile completeness.
- Added Recruiter candidate ranking and responsive 2–3 candidate comparison with strengths, gaps, missing skills, ratings, and interview questions.
- Added safe local TEST fixtures when fewer than three owned real candidates are available; fixtures are labeled and never persisted.
- Restricted Cloud AI to validated narrative enrichment while retaining deterministic local score/breakdown and automatic Local fallback.
- Enriched Application candidates from profile/evidence and Recruiter-owned ratings.
- Fixed null ratings displaying as zero.
- Validated 13 Jest cases, targeted ownership Rules in Emulator, real Recruiter UI, Production state preservation, and Production build.

## 2026-09-05 — Phase 01W I18N and Theme Polish

- Finalized bilingual Admin presentation copy for the remaining Add Admin, Edit Account, logout, audit, and diagnostic surfaces.
- Preserved stored data, permission keys, raw audit actions, account state transitions, RBAC, routes, API contracts, and the approved visual/theme baseline.
- Validation: targeted Jest suites 27/27 PASS; `CI=true npm run build` PASS.
