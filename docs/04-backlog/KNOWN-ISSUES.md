# Academia Smart — Known Issues

## P2 — Historical hardcoded workflow copy

Some large legacy workflow modules and print-only templates retain Arabic hardcoded presentation strings. They do not affect stored data, RBAC, routes, or API contracts; migrate them incrementally to the existing locale dictionaries before a public multilingual release.

## Phase 1U Release Security / Storage Gate — 2026-09-04

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1U-RUNTIME-AUDIT-001 | Fixed and closed | Build-only dependencies inflated the Production audit and two patchable transitive packages remained vulnerable | runtime omit-dev now 0 critical / 0 high; React/security/build PASS |
| KI-PHASE1U-CRA-LEGACY-001 | P1 — conditional build-tool risk | CRA 5/Jest/SVGO/Workbox tree retains critical/high advisories | trusted build environment; separately approved CRA replacement, no forced audit fix |
| KI-PHASE1U-FIREBASE-CLI-001 | P1 — developer-tool risk | Firebase CLI transitive tree retains critical/high advisories including `tar` | update CLI and rerun Emulator/deploy tooling in an isolated maintenance phase |
| KI-PHASE1U-RUNTIME-MODERATE-001 | P1 — controlled major upgrade | nine moderate rows remain through Express 4 and Firebase Admin optional storage chains | controlled Express 5/Firebase major compatibility phase; current controls and 0 critical/high accepted |
| KI-PHASE1U-DURABLE-STORAGE-001 | P1 — FIX_BEFORE_PUBLIC_DEPLOY / SAFE_TO_DEFER_FOR_GRADUATION_DEMO | project has no Storage bucket and bucket creation is denied because billing is absent | when public deployment is approved: attach/enable billing, create a private bucket, implement secure proxy, execute E2E matrix |
| KI-PHASE1U-CLOUDINARY-AUTH-001 | Not selected | existing private Cloudinary credential returns 401; unsigned presets are not RBAC-safe | do not use for documents unless a valid private server credential is provisioned and tested |

`REMAINING_P0=0`. `PHASE_1U_STATUS=COMPLETE — GRADUATION_RELEASE_GATE_PASS / PUBLIC_STORAGE_DEFERRED`. The controlled local graduation demo is ready; durable private storage is conditional only for public deployment.

## Phase 1T UI/UX Redesign Closure — 2026-09-03

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1T-VISUAL-CONSISTENCY-001 | Fixed and closed | Authentication, role dashboards, workflow surfaces, dialogs, and feedback used fragmented visual treatments | centralized token system and shared presentation primitives; tests/build PASS |
| KI-PHASE1T-AUTH-NATIVE-VALIDATION-001 | Fixed for authentication | browser-native English required-field prompts conflicted with the Arabic flow | Auth forms use controlled validation and `noValidate` |
| KI-PHASE1T-MOBILE-REHEARSAL-001 | P2 validation follow-up | in-app browser viewport remained at a 768px floor when 390px was requested | CSS 639px breakpoint and build validated; perform one physical-device/independent mobile-browser rehearsal before public release |
| KI-PHASE1T-DATA-LABEL-I18N-001 | P1 product polish | historical English data values and technical contract statuses can still appear if a view renders stored values directly | add a canonical display-label mapping; do not rewrite stored IDs/status contracts |

Phase 1T closes with `REMAINING_P0=0`. Dependency security, durable public file storage, and the other Phase 1S P1 items remain unchanged.

## Phase 1S Final Regression Closure — 2026-09-03

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1S-EMPTY-STATE-001 | Fixed | Published Jobs could momentarily show an empty state before the first Firestore snapshot | explicit loading state; tests/build PASS |
| KI-PHASE1S-ASSISTANT-SESSION-001 | Fixed | Smart Assistant session storage was shared between accounts on the same browser | per-UID session key plus account-change reload |
| KI-PHASE1S-ASSISTANT-RBAC-001 | Fixed | Limited Admin inherited generic Admin help text | dedicated permission-aware Limited Admin knowledge and page hint; focused tests PASS |
| KI-PHASE1S-TEST-BOUNDARY-001 | Fixed | pure Assistant tests loaded the full Router runtime | extracted `assistantKnowledge.js`; full React 51/51 PASS |
| KI-PHASE1S-CREDENTIAL-001 | Fixed operationally | Limited Admin TEST credential file had drifted from the retained Auth identity | same UID/profile/permissions retained; controlled password sync and login/token refresh PASS |
| KI-PHASE1S-DEPENDENCY-001 | P1 — FIX_BEFORE_PUBLIC_RELEASE | installed `--omit=dev` graph reports 6 critical and 85 high findings, largely inherited through CRA/Jest but including runtime dependency paths | controlled upgrade/inventory phase; move build tools to dev; full regression; never force audit fix |
| KI-PHASE1S-STORAGE-001 | P1 — FIX_BEFORE_PUBLIC_RELEASE | local uploads are host-bound without a separately proven durable public-deployment storage SLA | select durable storage/backup and prove restore before Internet release |
| KI-NOTIFY-LEGACY-STATE-001 | P1 — SAFE_TO_DEFER_FOR_DEMO | two historical workflow notifications have `read=true` with legacy `status=unread` | optional manifest-bound normalization; current UI/business state remains correct |
| KI-PHASE1S-CLOUD-AI-001 | P1 — SAFE_TO_DEFER_FOR_DEMO | optional Cloud AI has no authenticated governance/rate/privacy/monitoring boundary | keep Local fallback; do not enable Cloud Production until governed |

Phase 1S closes with `REMAINING_P0=0`. Controlled graduation demo is ready; public release remains conditional on the dependency/storage gate.

## Phase 1Q Ratings Closure — 2026-09-02

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-RATING-RELATION-001 | Fixed and closed | rating requests/ratings lacked trusted Application/Interview ownership relations | trusted API derives all IDs; real Production readback PASS |
| KI-RATING-DUPLICATE-001 | Fixed and closed | random IDs and query-only checks allowed request/rating duplicate races | deterministic per-Interview/request IDs; resolved request cannot resubmit; count remains one |
| KI-RATING-VALIDATION-001 | Fixed and closed | score range was only a UI star constraint | API integer 1–5 validation; 0/6 negative checks PASS |
| KI-RATING-DEEPLINK-001 | Fixed and closed | rating request/result events did not open exact entities | Recruiter request and Lecturer result both open highlighted exact targets |
| KI-RATING-RBAC-001 | Fixed and closed | Recruiter clients could directly create arbitrary rating rows | Rules deny direct client rating/rating-event creation; trusted API validates completed owned workflow |
| KI-RATING-STATUS-001 | Fixed and closed | accepting a request left `businessStatus=pending` | action endpoint updates status/businessStatus consistently for rating requests |
| KI-APPLICATION-POST-INTERVIEW-001 | P1 | Application remains `interview_scheduled` after completed Interview/rating | define an approved post-interview Application state model before adding a new status |
| KI-RATING-ANALYTICS-001 | P1 | Recruiter card shows rating count/stars but no dedicated Admin/global analytics or accessible numeric average | address in a separately scoped reporting/accessibility phase |

Phase 1Q is complete with one completed Interview01, one resolved request, one valid 4/5 Rating01, working deep links, and `REMAINING_P0=0`.

## Phase 1P Interviews Closure — 2026-09-02

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-INTERVIEW-RELATION-001 | Fixed and closed | interview/application/job relation and Application status were not synchronized | atomic batch; real Production readback; all four ownership links PASS |
| KI-INTERVIEW-DEEPLINK-001 | Fixed and closed | interview notifications opened the general Notifications section | dedicated Lecturer interview view and exact schedule/reschedule deep links PASS |
| KI-INTERVIEW-DUPLICATE-001 | Fixed and closed | a second interview for the same Application could be scheduled at a different time | deterministic ID plus active-duplicate UI guard; real retry denied; count remains one |
| KI-INTERVIEW-TRANSACTION-001 | Fixed and closed | transaction pre-read of a nonexistent interview was denied by current Rules | replaced with one Rules-compatible atomic batch; real UI creation PASS |
| KI-INTERVIEW-NATIVE-VALIDATION-001 | Fixed and closed | native segmented date/time controls could surface browser validation behavior in the Arabic flow | explicit format inputs and custom Arabic validation |
| KI-INTERVIEW-CONFLICT-001 | P1 | conflict detection covers the current Recruiter/owned interviews but not candidate conflicts across Recruiters | implement trusted global availability check in a later scheduling backend phase |
| KI-INTERVIEW-LIFECYCLE-001 | P1 security hardening | UI exposes intended lifecycle actions, while Rules do not enforce a strict transition graph | add backend/Rules transition policy in a separately controlled security deployment |

Phase 1P is complete with one future rescheduled Interview01, working notification deep links, correct ownership, and `REMAINING_P0=0`.

## Phase 1O Documents / Notifications Closure — 2026-09-02

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1M-DOCS-001 | Fixed and closed | Document upload/review/download had not been validated | real upload, authenticated view, human review, persistence, and result UI PASS |
| KI-NOTIFY-DOCUMENT-001 | Fixed and closed | Lecturer upload did not reliably notify its Recruiter | deterministic `document_uploaded`; visible unread event, badge, target IDs, and exact deep link PASS |
| KI-NOTIFY-DEEPLINK-001 | Partially closed / P1 remainder | Document and application event aliases now resolve to exact dashboard sections/entities | both document deep links PASS; validate Interview-family deep links in the next workflow phase |
| KI-NOTIFY-READSTATE-001 | Fixed for new/UI writes; legacy P1 | render-time auto-read and mixed new-event status were removed | explicit click/Mark All writes only `read/readAt`; historical rows with `status=unread` need optional backfill |
| KI-AI-DOCUMENT-NOTE-001 | Fixed and closed locally | Document review-note assistant was missing | editable advisory Hybrid action implemented; Local fallback verified; no auto-save/decision |
| KI-AI-CLOUD-GOV-001 | P1 | Cloud endpoint is optional and no authenticated backend/governance boundary is configured | retain Local fallback; add auth, privacy, rate limits, and logging before Cloud Production use |
| KI-NOTIFY-PRODUCER-001 | P1 security hardening | receiver ownership/read updates are enforced, but event-family sender/relationship constraints can be narrower | move sensitive producers to trusted backend or add Rules per event family in a separately deployed security phase |

Phase 1O is complete with Document01 approved, correct ownership, authenticated file access, two deterministic document events, working document deep links, and `REMAINING_P0=0`.

## Phase 1N Jobs & Applications Closure — 2026-09-01

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1N-JOB-SUBMIT-001 | Fixed and closed | Job submit could validate stale React state instead of the visible form values | authoritative submit snapshot; real JOB-01 creation and readback PASS |
| KI-PHASE1N-APP-DUP-001 | Fixed and closed | query-only duplicate detection had a concurrent-create race | deterministic position+lecturer application ID; UI and Production count both remain one |
| KI-PHASE1N-APP-SCHEMA-001 | Fixed and closed | new applications omitted canonical university/timestamp fields | `universityId`, `submittedAt`, and `createdAt` present; ownership tests 2/2 PASS |
| KI-PHASE1N-STATUS-001 | Fixed and closed | `under_review` displayed as a raw value and was absent from Lecturer filtering | localized label/color/filter and real Lecturer synchronization PASS |
| KI-PHASE1N-JOB-TYPE-001 | Fixed and closed | Manage Positions mixed canonical `type` with legacy `employmentType` | canonical update plus legacy read fallback; build PASS |
| KI-PHASE1N-COUNT-001 | Fixed and closed | job views used the stale stored `positions.applications` value | Recruiter count comes from owned applications; untrusted Lecturer count removed; JOB-01 shows one applicant to its owner |
| KI-NOTIFY-DEEPLINK-001 | P1 functional | the stored job/application deep links are not executed by Lecturer cards, and Recruiter Notifications filters out `application` | add entity-aware navigation and include recruiter application events in the separately approved Notifications phase |
| KI-NOTIFY-READSTATE-001 | P1 data/UI | Lecturer notification rendering writes `read=true` automatically but leaves `status=unread` | make read transitions explicit/atomic and normalize both fields in the Notifications phase |

Phase 1N is complete with one open JOB-01, one `under_review` Application01, three correctly addressed/idempotent notifications, `REMAINING_P0=0`, and no workflow blocker. Notification read-state/deep-link behavior remains P1.

## Phase 1M Lecturer Workflow Closure — 2026-09-01

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1M-SIGNUP-001 | Fixed and closed | Lecturer signup did not explicitly persist the active account status | signup now writes `accountStatus=active`; real signup/login and final readback PASS |
| KI-PHASE1M-NOTIFY-INIT-001 | Fixed and closed | first-session notification listener could initialize before the profile write and retain a permission failure | post-profile full navigation reinitializes providers; Notifications page/empty state opened without permission errors |
| KI-PHASE1M-RBAC-001 | Closed | Lecturer cross-role route, protected-field, cross-user, ownership, and blocked-session controls were validated | real UI/runtime plus targeted Demo Emulator matrix 14/14 PASS |
| KI-PHASE1M-DOCS-001 | PARTIAL / deferred | Documents page opened and exposed the 25 MB picker, but upload/download/preview/review was outside Phase 1M | execute in a separately approved Documents workflow |
| KI-NOTIFY-DOCUMENT-001 | P1 functional | automatic recruiter notification after Lecturer document upload is not yet validated/complete | implement and test in the Documents/Notifications phase |
| KI-NOTIFY-DEEPLINK-001 | P1 functional | notification entity deep links remain incomplete | implement durable application/document/interview navigation in a separate phase |

Phase 1M is officially closed with Lecturer01 enabled/active, its persisted profile and academic relationship valid, trusted verification fields protected, block/unblock and Audit Log validated, and `REMAINING_P0=0`.

## Phase 1L Recruiter Workflow Closure — 2026-09-01

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1L-PROVISION-001 | Closed | Real Recruiter signup/approval now preserves pending until provisioning succeeds, persists no plaintext password, links Auth/profile/university, and prevents duplicate approval | Production Recruiter01 PASS; focused Emulator approval/rejection 2/2 PASS |
| KI-PHASE1L-RBAC-001 | Closed | Recruiter UI, cross-role mutations, cross-owner application/document/interview/rating/notification access, and blocked-session cutoff were validated | real UI/runtime plus targeted Emulator ownership/session 7/7 PASS |
| KI-PHASE1L-REJECT-001 | Closed | Real rejection retains the rejected request and trusted audit while removing the staged disabled Auth identity and creating no recruiter profile | Production Recruiter02 PASS |
| KI-PHASE1L-ASSISTANT-001 | Fixed | Expected Firestore denial after blocking showed an uncaught development overlay because Smart Assistant did not catch its role lookup | safe common-role fallback added; React 8/8 and build PASS |
| KI-NOTIFY-DEEPLINK-001 | P1 functional | Recruiter notifications filter to rating/verification types and do not honor a generic stored `deepLink`; application/document/interview entity navigation remains incomplete | address in a separate notification/deep-link phase before full Lecturer/Job E2E |

Phase 1L is officially closed with Recruiter01 active/enabled, Recruiter02 rejected without Auth/profile, protected Admin accounts unchanged, and `REMAINING_P0=0`.

## Phase 1K RBAC Closure — 2026-09-01

| ID | Final status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1K-AUTH-001 | Closed | Add Admin token refresh and backend auth error classification were corrected, then the real UI creation/login flow passed | retain 5/5 client tests, 9/9 security suite, and final 3/3 targeted RBAC regression |
| KI-PHASE1K-RBAC-001 | Closed | Limited Admin has only Reports/Audit access; management UI/routes/data writes are denied; temporary permission and block/unblock restore cleanly | final Production permissions are exactly `reports.view` and `audit.view` |
| KI-PHASE1K-RUNTIME-001 | Operational guard remains | Local API Admin credentials are external and process-scoped | use the secured startup procedure after each Local API restart |

No new RBAC defect was found. Ending a blocked user’s browser session and requiring a fresh login after unblock is expected security behavior.

Phase 1K is officially closed with `REMAINING_P0=0`. Remaining P1 work is outside Phase 1K: file ownership/Production File API policy, dependency modernization, legacy-admin fallback removal, trusted atomic audit mutations, notification/deep-link completion, and authenticated Cloud AI governance.

## Phase 1K Limited Admin Auth Path — 2026-09-01

| ID | Severity / status | Finding | Evidence / next action |
|---|---|---|---|
| KI-PHASE1K-AUTH-001 | Fixed locally; manual Production UI validation pending | Add Admin used a cached ID token without a bounded refresh, while backend auth middleware misclassified actor-profile/Admin configuration failures as an invalid session | frontend 5/5, security 9/9, targeted Emulator 2/2 PASS; repeat Add Admin manually |
| KI-PHASE1K-RUNTIME-001 | Operational guard | Firebase Admin credentials are safely external but process-scoped; restarting the Local API without its secured startup environment makes privileged routes unavailable | current API health reports `adminCredentialsConfigured=true`; retain a secured repeatable local startup procedure |

No Phase 1K Production account or data write has occurred. The issue is not closed end-to-end until the manual UI attempt succeeds and Auth, Firestore `users`, exact permissions, and Audit Log are verified.

## Phase 1J Production Academic Seed — 2026-08-31

| ID | Status | Finding | Next action |
|---|---|---|---|
| KI-SEED-EXECUTOR-001 | Closed for academic baseline | Controlled Production Seed completed atomically, verified 2/3/4/6, and idempotency readback passed | keep the execution manifest for a separately approved rollback only |
| KI-SUBJECT-CODE-001 | P2 product improvement | Electrical engineering retains the approved current fallback `SUB101` | improve department-prefix mapping in a separately approved feature phase; do not rewrite the seeded code |

## Phase 1I Seed Executor Review — 2026-08-31

| ID | Severity | Finding | Evidence / next action |
|---|---|---|---|
| KI-SEED-EXECUTOR-001 | Closed by Phase 1J | Guarded executor, Demo evidence, and Production academic baseline are complete | retain manifest and use a separate approval for workflow/account creation |
| KI-EMULATOR-RUNTIME-001 | Closed | Default official JAR cache size/SHA matched Firebase CLI metadata; Firestore/Auth Emulator and full harness passed on Demo project | retain the JDK 17 compatibility note; Java 21 is a future CLI maintenance concern, not a Phase 1I blocker |

## Phase 1H Planning Findings — 2026-08-31

| ID | Severity | Finding | Evidence / next action |
|---|---|---|---|
| KI-SEED-EXECUTOR-001 | Superseded by Phase 1I build | Guarded executor and local manifest design now exist; Emulator evidence remains required | see Phase 1I gate above |
| KI-NOTIFY-DOCUMENT-001 | P1 functional | UploadDocuments creates a document but does not notify its recruiter; document-review notification has no deep link | fix before expecting document E2E notification/deep-link PASS |
| KI-NOTIFY-DEEPLINK-001 | P1 functional | Several notifications link only to dashboard sections; dashboards retain internal state | implement durable entity deep links in a separate phase |
| KI-AI-CLOUD-001 | P1 architecture | Cloud AI is an optional unauthenticated browser endpoint contract, without server implementation in this repository | add authenticated backend/governance before production AI reliance |
| KI-AI-FEATURE-001 | P2 feature | Candidate compare/ranking and document review-note AI are absent | separate AI feature phase; AI remains advisory |

Phase 1H created planning documents only. It did not alter the closed P0 count (`REMAINING_P0=0`).

## Phase 1G Production Rules Closure — 2026-08-31

| ID | Final status | Evidence | Remaining action |
|---|---|---|---|
| KI-PROD-RULES-001 | Closed Phase 1G | deployed Rules match validated local SHA؛ anonymous reads/writes DENIED؛ Super Admin/UI smoke PASS | retain regression and rollback artifacts |
| KI-SEC-001 | Closed Phase 1G | Firestore Rules deployed only؛ 30/30 pre-deploy security tests؛ no unexpected Permission Denied | include in future release regression |
| KI-DATA-PASSWORD-001 | Closed Phase 1E | recruiterRequests 0؛ plaintext-password records 0 | none |

`P0_FIRESTORE_PUBLIC_ACCESS=CLOSED`، `HISTORICAL_PLAINTEXT_PASSWORD_P0=CLOSED`، and `REMAINING_P0=0`.

Remaining P1 categories: external/provider file ownership and backup policy، Production File API configuration، dependency vulnerabilities/toolchain modernization، legacy admin compatibility fallback، and trusted/atomic audit mutation architecture.

## Phase 1E Production Reset Result — 2026-08-31

| ID | Final status | Evidence | Remaining action |
|---|---|---|---|
| KI-DATA-PASSWORD-001 | Closed by reset | recruiterRequests 0؛ plaintext password records 0 | none |
| KI-RECRUITER-RECON-001 | Superseded by approved reset | test requests/users/Auth identities removed | validate future seeded workflow |
| KI-RECRUITER-UNI-001 | Superseded by approved reset | test recruiter profiles removed | enforce canonical ID on future data |
| KI-APP-OWNER-001 | Superseded by approved reset | applications 0 | enforce ownership on future data/Rules |
| KI-INTERVIEW-REL-001 | Superseded by approved reset | interviews 0 | enforce relations on future data |
| KI-AUTH-ORPHAN-001 | Closed by reset | Auth 1 and Firestore users 1؛ protected identity aligned | monitor future provisioning |
| KI-NOTIFICATION-SCHEMA-001 | Historical data closed | notifications/adminNotifications 0 | validate schema against future seed |
| KI-RESET-AUDIT-001 | Mitigated | all 85 logs retained؛ reset boundary added؛ count 86 | optional later archival/classification |

Phase 1E historical state: `KI-PROD-RULES-001` was still open immediately after reset. It was subsequently closed by the controlled Phase 1G Production Rules deployment.

Current remaining P1 categories: external/provider file ownership and backup policy، Production File API configuration، dependency vulnerabilities، legacy admin compatibility fallback، and trusted/atomic audit mutation architecture.

## Phase 1F Backup/Restore Gate — 2026-08-31

| ID | Severity | Finding | Evidence | Required gate |
|---|---|---|---|---|
| KI-BACKUP-FS-001 | Closed backup check | Firestore current snapshot needed | 294/294 raw typed documents; all counts/checksums match | retain verified backup |
| KI-BACKUP-AUTH-001 | Closed Phase 1F | Auth export lacked Firebase SCRYPT project parameters | protected local config validated; Auth Emulator hash import 14/14 with UIDs/metadata/Super Admin PASS | retain encrypted/local-sensitive backup controls |
| KI-RESTORE-FS-001 | Closed Phase 1F | Firestore restore was not Emulator-tested | portable Java 21 startup PASS؛ restore 294/294؛ all paths/typed fields and integrity checks PASS | retain test evidence and portable runtime checksum |
| KI-RESTORE-AUTH-001 | Closed Phase 1F | Auth structural restore required password-compatible validation | Auth Emulator SCRYPT import 14/14; UIDs and metadata/Super Admin PASS; login intentionally not tested without safe credential | retain test evidence |
| KI-BACKUP-FILES-001 | P1 | External file objects are not included | 44 metadata refs inventoried; external objects not downloaded | separate provider backup/ownership policy if required |

`RESTORE_READY_FOR_TEST_DATA_RESET` was achieved and the separately authorized Phase 1E reset subsequently completed successfully.

## Phase 1E Reset Readiness — 2026-08-31

| ID | Severity | Finding | Current evidence | Gate |
|---|---|---|---|---|
| KI-RESET-SUPER-001 | Protected | Explicit Super Admin must never enter reset candidates | one exact Auth/users identity; candidate count 0 | hard-coded exclusion + pre/post login validation |
| KI-RESET-BACKUP-001 | Closed by Phase 1F | fresh current Firestore snapshot was required | Production 294 / backup 294؛ all counts/checksums match | retain Phase 1F backup |
| KI-RESET-AUTH-001 | Closed Phase 1F | Auth export required password-compatible restore proof | configuration validated; Auth Emulator import 14/14 including hashes/salts and Super Admin PASS | preserve sensitive configuration outside project ZIP |
| KI-RESET-FILE-001 | P1 | physical ownership of external/unknown file references is unproven | 29 external/unknown refs; 12 local refs point to 3 missing files | metadata-only reset; separate provider cleanup review |
| KI-RESET-AUDIT-001 | P1 governance / mitigated | 85 historical logs were retained and one reset boundary log was added | post-reset count 86؛ no audit deletion | optional later archive/classification |

The approved reset eliminated the legacy database/Auth test-data integrity findings، including all eight remaining password-bearing requests. External provider objects and code/configuration risks remain separate.

## Historical Phase 1D Production Remediation Snapshot — Superseded by Reset

| ID | Severity | Finding | Dry-run classification / count | Next gate |
|---|---|---|---|---|
| KI-DATA-PASSWORD-001 | Closed Phase 1E | historical password field remained on approved recruiter requests | pre-reset 8؛ post-reset 0 | none |
| KI-RECRUITER-RECON-001 | Superseded Phase 1E | no complete safe recruiter identity case | test identities removed | validate future seed |
| KI-RECRUITER-UNI-001 | Superseded Phase 1E | recruiter users missing canonical universityId | test profiles removed | enforce future writes |
| KI-APP-OWNER-001 | Superseded Phase 1E | applications missing recruiterId | applications 0 | enforce future writes/Rules |
| KI-INTERVIEW-REL-001 | Superseded Phase 1E | nine interviews incomplete | interviews 0 | enforce future writes |
| KI-NOTIFICATION-SCHEMA-001 | Historical data closed | missing recipient and historical readAt | notifications 0 | validate future seed |
| KI-AUTH-ORPHAN-001 | Closed Phase 1E | enabled Auth identities without users doc | Auth/users each 1 protected identity | monitor provisioning |
| KI-FILE-PROD-001 | P1 | document/local file mismatch | 0 local available، 3 local missing، 37 external، 1 unknown across 41 refs | actual host manifest and migration plan |
| KI-ADMIN-001 | P1 compatibility | data has no legacy admin, but fallback remains in code/Rules | 4 source layers + test expectation | remove/test before Rules deploy |

Phase 1D itself made no broad data changes. M1A removed one field، and the later separately approved Phase 1E reset removed the remaining test records. The table now records their final disposition.

## Historical Phase 1B Production Read-only Snapshot — Current Disposition Added

| ID | Severity | Production finding | Count / evidence | Required gate |
|---|---|---|---|---|
| KI-PROD-RULES-001 | Closed Phase 1G | Phase 1B found public full read/write | deployed validated deny-by-default rules؛ anonymous read/write DENIED |
| KI-DATA-PASSWORD-001 | Closed Phase 1E | recruiterRequests contained historical password field | post-reset requests/password records 0 | none |
| KI-BREAKGLASS-001 | Closed Phase 1C | Explicit Super Admin and manual login validation complete | Firestore/Auth readback + `http://localhost:3015` dashboard and Accounts/Permissions PASS | `BREAK_GLASS_READY` |
| KI-RECRUITER-RECON-001 | Superseded Phase 1E | approved requests lacked usable recruiter account | requests/test identities removed | validate future seed |
| KI-RECRUITER-UNI-001 | Superseded Phase 1E | recruiter profiles lacked universityId | test profiles removed | enforce future writes |
| KI-APP-OWNER-001 | Superseded Phase 1E | applications lacked recruiterId | applications 0 | enforce future writes/Rules |
| KI-INTERVIEW-REL-001 | Superseded Phase 1E | interviews missed relations | interviews 0 | enforce future writes |
| KI-AUTH-ORPHAN-001 | Closed Phase 1E | Auth identities lacked users doc | Auth/users each 1 | monitor provisioning |
| KI-NOTIFICATION-SCHEMA-001 | Historical data closed | missing recipient / mixed state | notifications 0 | validate future seed |
| KI-FILE-PROD-001 | P1 | File API URL/origin/project/ADC not configured | configuration evidence | configure/test production host before cutover |

## Open P0/P1 in or adjacent to Phase 1

| ID | Severity | Issue | Status / next gate |
|---|---|---|---|
| KI-SEC-001 | Closed Phase 1G | Validated Firestore Rules are deployed to Production | active rules match local؛ public access DENIED؛ Super Admin/UI smoke PASS |
| KI-AUTH-001 | Closed locally | Recruiter provisioning success/failure/idempotency was not integration-tested | Auth+Firestore Emulator scenarios now PASS; keep Production smoke test for an approved release window |
| KI-DATA-001 | Closed Phase 1E | Legacy recruiter requests contained plaintext password and lacked `authUid` | recruiterRequests 0؛ plaintext password records 0 |
| KI-DEP-001 | P1 / npm critical | audit reports 6 critical and 60 high packages in dependency graph | Target CRA/toolchain/Express major migration; no auto-fix/force |
| KI-ADMIN-001 | P1 compatibility | explicit Super Admin migration is complete, but legacy fallback remains in local code/Rules | remove fallback only after login validation، controlled Rules deploy، and separate approval |
| KI-FILE-001 | Closed locally | Authenticated cross-owner/local missing-file flows were not tested with real tokens | Auth Emulator token integration now PASS |
| KI-FILE-002 | P1 | external Cloudinary/CV URLs bypass Local File API authorization | storage policy/provider migration later |
| KI-AUDIT-001 | P1 | academic/general admin logs remain client-authored and non-atomic | move all admin mutations to trusted backend in later phase |
| KI-RATE-001 | P2 | rate limiter in-memory and per instance | shared store/reverse proxy limiter for production |
| KI-MALWARE-001 | P2 | magic-byte validation exists but no antivirus/sandbox | add scanning/quarantine policy before production |
| KI-EMU-JAVA-001 | P2 tooling | `firebase-tools` 14 passes on Java 17 but warns CLI 15 will require Java 21 | install/select JDK 21 before a future Firebase CLI major upgrade; do not change current validated CLI during Phase 1A |

## Closed in Phase 1A

- Rules compile and deny-by-default matrix validated in Firestore Emulator.
- Recruiter signup, approval, login, double approve, existing email, failure compensation, and rejection validated with Auth Emulator.
- Limited Admin protection, blocked-session cutoff, ownership, Mark All Read, and Local File API token controls validated.
- Receiver-side notification business-field mutation was found and fixed; business actions now go through an authenticated backend endpoint.

## Phase 1C Status

- Production data backup: VERIFIED, 292 documents across 17 collection paths; stored only under `SENSITIVE-PRODUCTION-BACKUP`.
- Explicit Super Admin: Firestore/Auth readback PASS; manual application login، Admin Dashboard، and Accounts/Permissions PASS; `BREAK_GLASS_READY`.
- Limited Admin protection was PASS in the local Emulator at Phase 1C; the validated Rules were subsequently deployed in Phase 1G and public access is now closed.
- Phase 1C closed successfully with a WIP checkpoint. Historical database/Auth test records were later removed by the separately approved Phase 1E reset؛ code/Rules/dependency/file-provider issues remain separately tracked.

## Deferred Functional Issues (Out of Phase 1)

- Notification deep links and document-upload recruiter notification.
- Full notification schema migration and all producer idempotency.
- Legacy file migration/manifest reconciliation.
- Job table/report/export enhancements.
- Academic/audit report improvements.
- Native validation localization/i18n cleanup.
- Interview legacy relation hydration and atomic conflict enforcement.
- AI governance/features/document note assistant.

## Build Warnings

- CRA and Browserslist data are old.
- Existing unused-variable and hook-dependency ESLint warnings.
- Node emits a CRA transitive `fs.F_OK` deprecation warning.

## Data Cleanup

No live cleanup executed. See `docs/phase-01/DATA-CLEANUP-DRY-RUN.md`.
## Phase 1R AI disposition — 2026-09-02

| ID | Severity | Issue | Status / next gate |
|---|---|---|---|
| KI-AI-RANK-001 | Closed Phase 1R | Candidate ranking/compare and explicit scoring evidence were missing | deterministic ranking + 2–3 compare validated in real Recruiter UI |
| KI-AI-RATING-001 | Closed Phase 1R | null candidate rating could appear as `0/5` | unavailable ratings remain `null` / “غير متوفر” |
| KI-AI-CLOUD-001 | P1 | Cloud AI has no trusted authenticated backend/governance | keep Smart Local; design backend auth, rate limits, privacy, retention, monitoring |
| KI-AI-CONTEXT-001 | P1 | Cloud narrative remains unconfigured; Smart Local is the active deterministic assistant | provision only an authenticated backend with minimised context, governance, retention, and monitoring |
| KI-AI-CALIBRATION-001 | P1 | deterministic weights/taxonomy are not academically calibrated | review with domain experts before real decision support |
| KI-AI-OPS-001 | P1 | saved shortlists, compare export, AI-view audit, richer page/entity context are absent | future approved feature phase |
