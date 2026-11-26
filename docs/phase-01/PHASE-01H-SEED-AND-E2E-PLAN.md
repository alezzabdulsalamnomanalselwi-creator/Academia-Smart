# Phase 1H — Clean Seed Data & End-to-End Test Plan

Status: `PLAN ONLY / DRY RUN ONLY`  
Production writes: `NONE`  
Scope: design only; no Firestore/Auth/Rules/files/migrations/Seed execution.

## 1. Purpose and safety constraints

This plan starts from the clean, secured Production state: one protected Super Admin in Firebase Auth and `users`, 86 `adminLogs`, and zero test records in the recruitment, academic, and notification collections. It uses fictional Arabic-friendly data only. It does not document or generate passwords.

There is no current controlled Seed executor in the repository. A future execution must be separately approved, use explicit Production targeting, preflight the protected Super Admin, record an immutable manifest, and stop on any unexpected count or identity.

## 2. Proposed test accounts

All email aliases below are fictional `example.test` placeholders. Exact addresses, UIDs, and passwords are created only at the separately approved execution time; passwords are generated locally and stored outside the source tree and documentation.

| Account | Proposed alias | Creation method | Purpose |
|---|---|---|---|
| Existing Super Admin | existing protected account | Existing only; read-only validation | Baseline, approval, hierarchy, RBAC control |
| Limited Admin 01 | `limited-admin-01@example.test` | Super Admin UI/API workflow | `reports.view`, `audit.view` allow-list only |
| Recruiter 01 | `recruiter-01@example.test` | **Real Recruiter Signup → Pending Request → Super Admin Approval → Login** | Required provisioning regression |
| Recruiter 02 | `recruiter-02@example.test` | Real Signup/Approval by default | Multi-recruiter ownership/isolation; do not bypass the workflow unless separately approved |
| Lecturer 01 | `lecturer-01@example.test` | Real Lecturer SignUp + Profile workflow | JOB-01, documents, online interview, rating |
| Lecturer 02 | `lecturer-02@example.test` | Real Lecturer SignUp + Profile workflow | JOB-01, rejection path |
| Lecturer 03 | `lecturer-03@example.test` | Real Lecturer SignUp + Profile workflow | JOB-02, in-person/no-show path |

The default plan deliberately creates both recruiters through the real workflow because the current secure provisioning path is the feature under test. Recruiter 02 is a deferred controlled-seed option only if an approved test run needs acceleration after Recruiter 01 has already passed.

## 3. Proposed academic baseline

All 15 academic records begin `active: true`. Firestore assigns IDs during the future controlled seed; no manual document IDs are designed here.

| Level | Alias / name | Parent | Planned test use |
|---|---|---|---|
| University U1 | جامعة الاختبار التقنية | — | JOB-01 and JOB-02 |
| University U2 | جامعة الأكاديمية النموذجية | — | JOB-03 draft and inactive-parent test |
| College C1 | كلية الحوسبة | U1 | D1, D2 |
| College C2 | كلية الهندسة | U1 | D3 |
| College C3 | كلية العلوم التطبيقية | U2 | D4 |
| Department D1 | تقنية المعلومات | C1 | IT auto-code test |
| Department D2 | الذكاء الاصطناعي | C1 | AI auto-code test |
| Department D3 | الهندسة الكهربائية | C2 | fallback-prefix observation |
| Department D4 | علوم الحاسوب | C3 | CS auto-code test |

### Subjects

The current code persists only `departmentId` on `subjects`; `collegeId` and `universityId` below are resolved through the parent chain and **must not be redundantly persisted** without a future schema decision. The proposed codes are expected UI-generated values to validate, not manually forced IDs/codes.

| Subject | name | expected code | persisted `departmentId` | derived `collegeId` | derived `universityId` | status |
|---|---|---|---|---|---|---|
| S1 | نظم قواعد البيانات | IT101 | D1 | C1 | U1 | active |
| S2 | تطوير تطبيقات الويب | IT102 | D1 | C1 | U1 | active |
| S3 | أساسيات الذكاء الاصطناعي | AI101 | D2 | C1 | U1 | active |
| S4 | تعلم الآلة | AI102 | D2 | C1 | U1 | active |
| S5 | تحليل الدوائر الكهربائية | fallback observed (likely `SUB101` with current Arabic logic) | D3 | C2 | U1 | active |
| S6 | مبادئ البرمجة | CS101 | D4 | C3 | U2 | active |

The current `makeSubjectCode` logic explicitly recognizes Arabic IT/AI/CS department names but has no electrical-engineering mapping. The future test records the actual generated S5 code and treats a `SUB...` fallback as a known product gap, not as a seed failure.

## 4. Active/inactive test policy

Do not seed inactive data. Create all baseline items active, establish the positive workflows, then change only these items through the Super Admin UI:

| Test action | Entity | Expected assertion |
|---|---|---|
| Disable/re-enable U2 | University | It disappears/reappears in Recruiter Signup active-university selector; historical children remain |
| Disable/re-enable C2 | College | It is unavailable in child/job selectors while disabled |
| Disable/re-enable D3 | Department | It is unavailable in child/job selectors while disabled |
| Disable/re-enable S6 | Subject | It is unavailable in job subject selector while disabled |

No active parent is disabled before the jobs that depend on it are created.

## 5. Proposed jobs and application journey

Jobs are real recruiter UI creations, not Seed documents. Use a deadline relative to the execution date (`T+30`, `T+45`, `T+60`) so a delayed run does not create expired records.

| Job | Owner | Academic target | Type/status | Applicants | Purpose |
|---|---|---|---|---|---|
| JOB-01 — محاضر متعاون: نظم قواعد البيانات | Recruiter 01 | U1/C1/D1/S1 | Part-time, open, T+30 | Lecturer 01, Lecturer 02 | Applicant count, review, accepted/rejected branches |
| JOB-02 — محاضر متعاون: تعلم الآلة | Recruiter 01 | U1/C1/D2/S4 | Contract, open, T+45 | Lecturer 03 | Pending/interview/no-show branch |
| JOB-03 — محاضر زائر: مبادئ البرمجة | Recruiter 02 | U2/C3/D4/S6 | Visiting, draft, T+60 | none | Draft visibility, own-job management/report |

### Applications

| Application | Creation | Required transitions to test | Final planned evidence |
|---|---|---|---|
| APP-01: Lecturer 01 → JOB-01 | Real UI workflow | pending → under_review → interview_scheduled → approved | timeline, human decision note, recruiter ownership, AI assistant panel |
| APP-02: Lecturer 02 → JOB-01 | Real UI workflow | pending → rejected (reason required) | rejection note and lecturer status notification |
| APP-03: Lecturer 03 → JOB-02 | Real UI workflow | pending → interview_scheduled | interview cancel/no-show exercises; pending is asserted before transition |

Use current canonical status `approved`, not legacy `accepted`. The plan tests every requested status as a transition/timeline event rather than attempting to force all final states simultaneously.

## 6. Documents, interviews, and ratings

### Documents

Lecturer 01 uploads two newly created, fictional, minimal test PDFs through the Local File API only during a separately approved E2E run:

- `test-cv-lecturer-01.pdf`
- `test-experience-certificate.pdf`

They contain no real personal data. Recruiter 01 opens each file through the protected file route, approves one and rejects one with a reviewer note. The plan verifies the lecturer result notification contains the document title.

### Interviews

All interviews are created through `ManageInterviews`, never seeded.

| Interview | Source application | Type | Event sequence |
|---|---|---|---|
| INT-01 | APP-01 | Online with valid meeting URL | schedule → reschedule → complete |
| INT-02 | APP-03 | In Person with location | schedule → cancel |
| INT-03 | APP-03 after INT-02 cancellation | Online or In Person | schedule → no-show |

Three records are necessary to cover both terminal `cancelled` and `no_show` states. During INT-01 scheduling, attempt a second recruiter interview within 45 minutes to assert client conflict prevention. Verify application/job relations and the absence of `وظيفة غير محددة` for all new records.

### Rating

Lecturer 01 requests a rating from Recruiter 01 through the UI. Recruiter 01 accepts the request, submits one rating with feedback, and Lecturer 01 receives the result. Do not create a rating directly.

## 7. Expected notification and deep-link matrix

Notifications should be event-generated; no bulk notification seeding is allowed. `Current implementation` distinguishes the expected test from the current code behavior.

| # | Event | Recipient | Expected target | Current implementation / test outcome |
|---:|---|---|---|---|
| N1 | JOB-01/JOB-02 published | matching lecturers | job details / lecturer positions | generated with `deepLink`; click behavior must be tested |
| N2 | application submitted | owning recruiter | exact application | generated with recruiter applications link; click behavior must be tested |
| N3 | application status changed | lecturer | exact application | generated with lecturer applications link; click behavior must be tested |
| N4 | document uploaded | owning recruiter | exact document review | **MISSING:** upload creates document only; expected notification is a known gap |
| N5 | document reviewed | lecturer | exact document | generated with title/reviewer note, but no `deepLink` is written; expected deep link is a known gap |
| N6 | interview scheduled | lecturer | exact interview | generated, currently routes only to notification section |
| N7 | interview rescheduled | lecturer | exact interview | generated, currently routes only to notification section |
| N8 | interview terminal status | lecturer | exact interview | generated for complete/cancel/no-show, currently routes only to notification section |
| N9 | rating request / accepted rating | recruiter | rating action | generated; action navigation is state-based and must be tested without refresh |
| N10 | rating received / recruiter interest | lecturer | rating detail / profile | generated; no canonical deep-link contract currently |

This gives 10 notification flows/events. N4 and the deep-link portions of N5–N10 are acceptance gaps, not reasons to seed records directly.

## 8. Create-versus-seed matrix

| Entity / event | Create by Seed? | Create by real UI workflow? | Reason |
|---|---|---|---|
| Universities, colleges, departments, subjects | YES — 15 baseline docs only | edit/toggle/report via UI | Small stable prerequisite dataset |
| Existing Super Admin | NO | read-only baseline | Protected identity must remain untouched |
| Limited Admin 01 | NO | YES | Tests trusted Super Admin provisioning and RBAC |
| Recruiter 01 | NO | YES | Required approval/provisioning regression |
| Recruiter 02 | NO by default | YES | Avoid bypassing the same critical workflow |
| Lecturers 01–03 | NO | YES | Tests signup, profile completeness, ownership |
| Jobs 01–03 | NO | YES | Tests hierarchy selectors, publish/draft, notifications, reports |
| Applications 01–03 | NO | YES | Tests validation, ownership, counters, notifications |
| Documents and file bytes | NO | YES | Tests Local File API authorization/validation/review |
| Interviews | NO | YES | Tests relationship creation, conflict, notifications |
| Ratings | NO | YES | Tests request/accept/result workflow |
| Notifications | NO | automatic event output | Tests producer/idempotency/deep-link behavior |
| Audit logs | NO | automatic/trusted action output | Preserves audit integrity |

## 9. E2E execution order — 18 scenarios

| ID | Scenario | Gate / expected evidence |
|---|---|---|
| T1 | Production preflight | protected Super Admin, clean counts, Rules checksum, no Emulator target |
| T2 | Academic baseline seed execution (future approval) | 2/3/4/6 hierarchy, manifest IDs, all active |
| T3 | Academic hierarchy UI and subject-code test | add/edit/duplicate prevention/report; record actual S5 fallback behavior |
| T4 | Active/inactive hierarchy cases | selectors exclude disabled entities; history preserved |
| T5 | Limited Admin provisioning and RBAC | only `reports.view` and `audit.view` allowed |
| T6 | Recruiter 01 signup/approve/login | pending retained until successful provisioning; active recruiter/profile exists |
| T7 | Recruiter 02 signup/approve/login | multi-recruiter isolation |
| T8 | Lecturer signup/profile completion | 3 lecturers, compatible academic/profile data |
| T9 | Publish/manage JOB-01/JOB-02/JOB-03 | open/draft behavior, filters, PDF/print report |
| T10 | Lecturer browse/apply | three real applications, duplicate prevention, counters |
| T11 | Recruiter application review and candidate AI | status timeline, human note, match/strengths/gaps/questions |
| T12 | Document upload/review/file access | MIME/size/auth, notes, result notification; record N4/N5 gaps |
| T13 | Interviews | online/in-person, reschedule, complete, cancel, no-show, conflict, relations |
| T14 | Ratings and recruiter interest | request, accept, submit, result and duplicate handling |
| T15 | Notifications/read state/deep links | N1–N10; record exact link pass/fail per type |
| T16 | Reports and dashboard statistics | academic/report, jobs report, audit, print/PDF; CSV/Excel availability |
| T17 | RBAC and direct access regression | role routes, Firestore ownership, file access, anonymous denial |
| T18 | AI cloud/local fallback plus build/security regression | timeout/fallback, no auto decision, `test:security:all`, build |

## 10. RBAC plan — 15 assertions

| # | Actor | Assertion |
|---:|---|---|
| R1 | Super Admin | all Admin tabs and permitted actions accessible |
| R2 | Super Admin | protected own identity/security cannot be altered through normal UI |
| R3 | Limited Admin | Audit Log visible (`audit.view`) |
| R4 | Limited Admin | Academic Report visible (`reports.view`) |
| R5 | Limited Admin | Accounts/Permissions and Join Requests denied/hidden |
| R6 | Limited Admin | academic create/edit/toggle denied |
| R7 | Recruiter 01 | admin route denied |
| R8 | Recruiter 01 | own positions/applications/documents/interviews allowed |
| R9 | Recruiter 01 | Recruiter 02 data read/write denied |
| R10 | Recruiter 02 | Recruiter 01 data read/write denied |
| R11 | Lecturer 01 | admin and recruiter routes denied |
| R12 | Lecturer 01 | own applications/documents/notifications allowed |
| R13 | Lecturer 02 | Lecturer 01 private application/document access denied |
| R14 | Anonymous | users/adminLogs/arbitrary read and write denied |
| R15 | Blocked/suspended test status (only if separately approved) | session/route/data access cut off; restore account afterward |

R15 is optional because it mutates account status; it requires its own narrow approval and is not part of the initial Seed execution.

## 11. Reports and export coverage

The proposed data supports Academic hierarchy report, Recruiter jobs report, Admin statistics, Audit Log pagination/search, and browser Print/Save-as-PDF. Current code has no CSV/Excel export implementation; mark those checks `NOT AVAILABLE / GAP` rather than creating a fake export.

## 12. Cleanup/reset design

At future execution, generate a `seedBatchId` such as `phase-01h-YYYYMMDD-HHMM` only in the approved local execution manifest. Record every auto-generated Firestore ID and Auth UID, creation method, parent dependency, and expected owner.

- Baseline academic records may carry `testData: true` and `seedBatchId` only if the approved seed tool and Rules compatibility preflight confirm it is safe. The current data model does not require those fields.
- Workflow-created records should be cleaned from the immutable manifest and relationship order, not by broad marker queries.
- Never attach a seed marker to the protected Super Admin or modify its Auth/users document.
- A future cleanup is a separate destructive approval, with a fresh sensitive backup, exact UID/document manifests, pre/post Super Admin assertions, and a retained audit boundary.

## 13. Risks and blockers before execution

1. No controlled seed executor exists yet; direct browser/Firestore seeding must not be improvised.
2. Document-upload notification to recruiter is missing, and document-review notifications have no deep link.
3. Several notification deep links target dashboard sections, while dashboards use internal state rather than durable entity routes.
4. Cloud AI is an unauthenticated client endpoint contract (`REACT_APP_AI_API_URL`) with no local backend implementation in this repository.
5. Candidate ranking/compare and AI document-review-note capabilities are absent.
6. CSV/Excel exports are absent; PDF is browser print/Save-as-PDF rather than a generated PDF service.
7. Dependency and Production File API P1 items remain open and must be considered before a public release.

## 14. Password policy

No password appears in this document. At execution, generate one strong unique password per non-Super-Admin test account locally, use it only in the required UI/API creation step, retain it only in a sensitive local file outside the repository and ordinary ZIP checkpoint, and destroy it according to the approved cleanup policy.

## 15. Phase 1H decision

`PHASE_1H = PLAN ONLY`  
`SEED_EXECUTION = NOT AUTHORIZED`  
`PRODUCTION_WRITES_PERFORMED = NO`

