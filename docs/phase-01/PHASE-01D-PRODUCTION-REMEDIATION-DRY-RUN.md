# Phase 1D — Production Data Remediation Dry Run

**التاريخ:** 2026-08-31  
**المشروع:** `my-project-51bb7`  
**الوضع:** `DRY_RUN / READ_ONLY`  
**Production writes:** 0  
**Rules deploy:** لم يحدث  
**القرار:** `STILL_BLOCKED`

## Executive Summary

أُعيد فحص Production بعد Phase 1C باستخدام حساب Firebase CLI المصرح والمشروع المحدد صراحة. بقيت أعداد البيانات الأساسية ثابتة، وأصبح `adminLogs=84` بسبب سجل Phase 1C المتوقع. يوجد explicit Super Admin واحد ولا يوجد أي data candidate يعتمد legacy fallback.

النتائج القابلة للتنفيذ الآلي الآن محدودة: 8/8 applications يمكن اشتقاق `recruiterId` لها من position owner بصورة قطعية، و3/9 interviews المتأثرة لها application/position/recruiter وحيدة، وإشعاران قديمان يمكن اشتقاق مستلمهما من `to.id` وposition owner. لا توجد حالة recruiter كاملة يمكن تصنيفها SAFE بسبب university mapping غير الموثق أو غياب Auth/users، ولا يجوز تخمين المقابلات ذات الطلبات المتعددة أو `readAt` التاريخي.

## 1. Backup Verification

| Artifact | Verification |
|---|---|
| Phase 1C source checkpoint | readable، 119 entries، SHA-256 مطابق |
| Source checkpoint SHA-256 | `18FCA830069113D8786CDBDCAABE24D83F7F02713D1E4B09A2418633D385B5FD` |
| Sensitive Production backup | موجود وقابل للقراءة |
| Production manifest | 17 collection files، 292 records |
| Manifest SHA-256 | `C2721FFD92CC7136564E455AECA991882C54EE3790D48D3A71E6B46BA1CFC667` |
| Per-file verification | 0 hash failures، 0 record-count failures |

لم تُنسخ النسخة الحساسة إلى المشروع أو `docs/`. تحليل Phase 1D التفصيلي محفوظ محليًا خارج المشروع داخل `SENSITIVE-PRODUCTION-BACKUP`، ولا يحتوي تقرير التوثيق على password values أو tokens أو full emails.

## 2. Current Live Inventory

| Collection / service | Count |
|---|---:|
| users / Firebase Auth | 12 / 14 |
| recruiterRequests | 9 |
| applications | 8 |
| documents | 7 |
| interviews | 10 |
| ratings | 8 |
| notifications | 94 |
| positions / jobs | 13 / 0 |
| universities / colleges / departments / subjects | 5 / 5 / 5 / 3 |
| adminLogs / auditLogs | 84 / 0 |

## 3. Historical Password Findings — P0

لم تُطبع أو تُنسخ أو تُستخدم أي قيمة password. جرى فحص وجود الحقل فقط.

| Request | Status | Email | authUid? | Matching Auth | Matching users doc | Proposed action |
|---|---|---|---|---|---|---|
| `2ssgl…hrug` | approved | `al***@gmail.com` | no | yes | yes | RECONCILE_THEN_REMOVE |
| `39Mgc…Kt3g` | approved | `re***@example.com` | no | yes | no | RECONCILE_THEN_REMOVE |
| `AfkuL…GLQu` | approved | `ad***@system.com` | no | no | no | RECONCILE_THEN_REMOVE |
| `E27XI…d1SM` | approved | `77***@gmail.com` | no | no | no | RECONCILE_THEN_REMOVE |
| `FVYBV…Ukz0` | approved | `al***@gmail.com` | no | yes | yes | RECONCILE_THEN_REMOVE |
| `XmdBm…UcQK` | approved | `al***@gmail.com` | no | yes | no | RECONCILE_THEN_REMOVE |
| `Z494y…UO9G` | rejected | `al***@gmail.com` | no | no | no | REMOVE_PASSWORD_ONLY |
| `cRf3w…FrNf` | approved | `ab***@gmail.com` | no | no | no | RECONCILE_THEN_REMOVE |
| `dDBsZ…fSdO` | approved | `al***@gmail.com` | no | yes | yes | RECONCILE_THEN_REMOVE |

Counts: `REMOVE_PASSWORD_ONLY=1`، `RECONCILE_THEN_REMOVE=8`، `REVIEW_REQUIRED=0`. لا يجوز استخدام النسخة الاحتياطية لتسجيل الدخول أو استعادة plaintext password إلى Production.

## 4. Recruiter Reconciliation Matrix

التصنيف على مستوى identity case بالكامل. توجد داخل 3 حالات ambiguous حقول جزئية قطعية (`authUid=userId` و`accountStatus=active`) لكن لا تُصنّف الحالة SAFE قبل حل `universityId`.

| Case | Request | Auth/users evidence | University evidence | Classification | Proposed fields after approval |
|---|---|---|---|---|---|
| R-01 | `2ssgl…hrug` approved | Auth + users UID match؛ legacy `userId` موجود | English Twintech؛ لا يوجد canonical ID موثق في الطلب | AMBIGUOUS_REQUIRES_REVIEW | request `authUid`; user `accountStatus`; review `universityId` |
| R-02 | `39Mgc…Kt3g` approved | enabled Auth only؛ no users doc | `Sana'a University` مقابل أكثر من اسم عربي محتمل | AMBIGUOUS_REQUIRES_REVIEW | review users doc creation + `role/accountStatus/universityId/authUid` |
| R-03 | `AfkuL…GLQu` approved | no matching Auth/users identity | English Twintech only | NO_MATCH | manual ownership/account decision; do not create automatically |
| R-04 | `E27XI…d1SM` approved | no matching Auth/users identity | English Twintech only | NO_MATCH | manual review |
| R-05 | `FVYBV…Ukz0` approved | Auth + users UID match؛ legacy `userId` موجود | English Twintech؛ no canonical request ID | AMBIGUOUS_REQUIRES_REVIEW | request `authUid`; user `accountStatus`; review `universityId` |
| R-06 | `XmdBm…UcQK` approved | enabled Auth only؛ no users doc | English Twintech؛ no canonical ID | AMBIGUOUS_REQUIRES_REVIEW | review users doc creation + security fields |
| R-07 | `Z494y…UO9G` rejected | no Auth/users؛ expected for rejected flow | canonical universityId exists | NO_MATCH | no account creation; password removal only |
| R-08 | `cRf3w…FrNf` approved | no Auth/users | canonical universityId exists | NO_MATCH | manual account decision; do not provision from historical password |
| R-09 | `dDBsZ…fSdO` approved | Auth + users UID match؛ legacy `userId` موجود | `Sana'a University` is not a unique canonical mapping | AMBIGUOUS_REQUIRES_REVIEW | request `authUid`; user `accountStatus`; review `universityId` |
| R-10 | recruiter users doc only `Z2WbT…LWA2` | Auth + users match، active، no request | no university field or owned-position evidence | AMBIGUOUS_REQUIRES_REVIEW | manual university assignment only |

Summary: `SAFE_AUTO_RECONCILE=0`، `AMBIGUOUS_REQUIRES_REVIEW=6`، `NO_MATCH=4`، `ALREADY_VALID=0`.

Additional facts:

- 4/4 recruiter profiles still lack `universityId`.
- 9/9 recruiterRequests still lack `authUid`; 3 carry a legacy `userId` that matches Auth and users exactly.
- 8 approved requests still do not satisfy the complete secure recruiter contract.
- Existing universities are stored with Arabic names, while several historical rows contain English labels. Translation similarity is not accepted as a migration key.

## 5. Application Ownership Backfill Matrix

All eight applications have an exact `positionId`; each position exists and has one `postedBy.id` that identifies a recruiter users document.

| Application | Applicant | Position | Proposed recruiter | Classification |
|---|---|---|---|---|
| `08oOk…4NPA` | `UqawM…D102` | `1d8ik…nnsf` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `9O8qo…hCSv` | `OK2dK…DMg1` | `h9o6R…Oobk` | `moX5T…GZr2` | SAFE_AUTO_BACKFILL |
| `ORl8P…TEXs` | `OK2dK…DMg1` | `OEvyE…SZml` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `gxIov…VnnL` | `UqawM…D102` | `BWODH…QMu6` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `jxpZH…qZQu` | `OK2dK…DMg1` | `TyGaL…mG3S` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `rsOFO…Ifhu` | `OK2dK…DMg1` | `BWODH…QMu6` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `wa46c…HXLY` | `UqawM…D102` | `gtz3v…N3B9` | `n0BsX…Pxt2` | SAFE_AUTO_BACKFILL |
| `yX2zn…qqYS` | `Z2WbT…LWA2` | `h9o6R…Oobk` | `moX5T…GZr2` | SAFE_AUTO_BACKFILL |

Summary: `SAFE_AUTO_BACKFILL=8`، `AMBIGUOUS=0`، `ORPHAN=0`.

## 6. Interview Relationship Backfill Matrix

One interview (`FVFIf…hd5e`) is already valid and is excluded from the nine affected rows below.

| Interview | Candidate evidence | Proposed application / position / recruiter | Classification |
|---|---|---|---|
| `HZ0Os…3icK` | exactly one candidate application | `yX2zn…qqYS` / `h9o6R…Oobk` / `moX5T…GZr2` | SAFE_AUTO_BACKFILL |
| `j6Ki0…UkL0` | exactly one candidate application | `yX2zn…qqYS` / `h9o6R…Oobk` / `moX5T…GZr2` | SAFE_AUTO_BACKFILL |
| `ysRQz…DQRk` | exactly one candidate application | `yX2zn…qqYS` / `h9o6R…Oobk` / `moX5T…GZr2` | SAFE_AUTO_BACKFILL |
| `9DlyP…e7nw` | 3 candidate applications؛ recruiter same | application/position unresolved؛ recruiter already `n0BsX…Pxt2` | AMBIGUOUS |
| `UbVOT…K7Bs` | 4 candidate applications | all three unresolved | AMBIGUOUS |
| `ZCrvW…eepA` | 3 applications owned by existing recruiter | application/position unresolved؛ recruiter already `n0BsX…Pxt2` | AMBIGUOUS |
| `ZFRab…8hAR` | 3 candidate applications؛ recruiter same | application/position unresolved؛ recruiter already `n0BsX…Pxt2` | AMBIGUOUS |
| `OXQgD…tNgX` | no matching application | none | ORPHAN |
| `d0ozt…QkLj` | candidate UID belongs to recruiter identity؛ no application | none | ORPHAN |

Summary for affected rows: `SAFE_AUTO_BACKFILL=3`، `PARTIAL_MATCH=0`، `AMBIGUOUS=4`، `ORPHAN=2`. Application status alone is not a safe discriminator because current scheduling code allows every application except rejected ones.

## 7. Notification Normalization Matrix

Affected union: 17 rows with no overlap between the two groups.

### Missing Canonical Recipient

| Notification | Evidence | Proposed recipient | Other normalized fields | Classification |
|---|---|---|---|---|
| `rDhpg…Ms4F` | legacy `to.id` equals exact position owner for linked application | `moX5T…GZr2` | `receiver=to`, `userId=to.id`, `read=false`, `readAt=null`; preserve legacy fields | SAFE_AUTO_NORMALIZE |
| `u9UpA…hP1w` | legacy `to.id` equals exact position owner for linked application | `moX5T…GZr2` | same | SAFE_AUTO_NORMALIZE |

### Read State vs Business State

| Type / business status | Count | Current read state | Proposed treatment | Classification |
|---|---:|---|---|---|
| rating_request / pending | 2 | `read=false`, no `readAt` | retain `status=pending`; canonical `read=false`, `readAt=null` | SAFE_AUTO_NORMALIZE |
| rating_request / accepted | 9 | `read=true`, no `readAt` | preserve business status and read flag; do not invent historical timestamp | AMBIGUOUS |
| document_review / approved | 2 | `read=true`, no `readAt` | preserve business status; manual policy for unknown `readAt` | AMBIGUOUS |
| document_review / rejected | 2 | `read=true`, no `readAt` | preserve business status; manual policy for unknown `readAt` | AMBIGUOUS |

Summary: `SAFE_AUTO_NORMALIZE=4`، `AMBIGUOUS=13`، `ORPHAN=0`. The `status` field is business data consumed by the UI and must not be overwritten by read-state migration.

## 8. Auth Orphan Analysis

| UID | Email | Enabled | Provider | Created | Last sign-in | Relations | Expected role | Classification |
|---|---|---|---|---|---|---|---|---|
| `lQhnK…ry23` | `re***@example.com` | yes | password | 2026-08-11 | 2026-08-11 | one approved recruiterRequest؛ no direct business records | recruiter evidence, university unresolved | KEEP_AND_REVIEW |
| `mcElo…sZt2` | `al***@gmail.com` | yes | password | 2026-08-11 | 2026-08-29 | one approved recruiterRequest؛ no direct business records | recruiter evidence, university unresolved | KEEP_AND_REVIEW |

Counts: `CREATE_USERS_DOC_SAFE=0`، `DELETE_AUTH_CANDIDATE=0`، `KEEP_AND_REVIEW=2`، `UNKNOWN=0`. Neither identity may be deleted automatically; one has recent sign-in activity.

## 9. Legacy Super Admin Fallback

Production data now has 1 explicit Super Admin and 0 legacy fallback candidates. The fallback remains in code:

| Layer | Evidence |
|---|---|
| Firestore Rules | `firestore.rules:26-36` (`legacySuperAdmin`) |
| Backend authorization | `server/security.js:47-52` |
| Route authorization | `src/components/auth/ProtectedRoute.jsx:39-40` |
| Admin UI/target protection | `src/components/dashboard/AdminDashboard.jsx:28,42-47` |
| Test expectation | `server/security.test.js:42-46` still expects legacy admin to be Super |

Removal is data-safe now, but it must be a separate source/rules change before—not after—the controlled Rules deployment. Update tests so a role-only admin is denied, run the full Emulator matrix, validate explicit break-glass login, then deploy under a rollback window. No source change occurred in Phase 1D.

## 10. File Reference Inventory

The physical local directory currently contains 0 files.

| Scope | LOCAL_AVAILABLE | LOCAL_MISSING | EXTERNAL | UNKNOWN | Total |
|---|---:|---:|---:|---:|---:|
| `documents.fileURL` | 0 | 3 | 3 | 1 browser-extension URL | 7 |
| CV/certificate/profile references | 0 | 0 | 34 | 0 | 34 |
| **All detected file-like references** | **0** | **3** | **37** | **1** | **41** |

Provider counts across all detected references: Cloudinary 10، Google Drive 4، Dropbox 0، other external 23، local missing 3، unknown 1. The 10 Cloudinary references are profile images; no Cloudinary document file was detected. The three localhost document references are classified `LOCAL_MISSING` because their filenames are absent from `server/uploads`.

## 11. Proposed Migration Dependency Order

| ID | Preconditions | Collections / scope | Affected | Safe-auto | Manual review | Fields | Rollback source | Validation | Risk | Deploy blocker |
|---|---|---|---:|---:|---:|---|---|---|---|---|
| M1A | fresh backup + incident approval | recruiterRequests rejected row | 1 completed | 1 | 0 | remove `password` only | sensitive backup; never restore plaintext to Production | count `9 → 8`; target readback and audit PASS | P0/High | YES — remaining P0 is M1B |
| M2 | approved identity decisions; exact email/UID checks | recruiterRequests, users, Auth metadata | 10 cases | 0 | 10 | `authUid`, possible users doc، `role`, `accountStatus` | document before images + Auth metadata | request/Auth/users one-to-one matrix | High | YES |
| M3 | canonical university mapping signed off | users + recruiterRequests | 11 docs (4 users + 7 requests) | 0 | 11 | `universityId` | before images | every ID exists and inactive/active policy verified | High | YES |
| M1B | M2/M3 decisions complete; credential policy approved | recruiterRequests approved rows | 8 | 0 | 8 | remove `password` only | forensic backup only; no plaintext restore | zero password fields | P0/High | YES |
| M4 | positions unchanged; updateTime preconditions | applications | 8 | 8 | 0 | `recruiterId` | Phase 1C backup + fresh before image | app recruiter equals position owner | Medium | YES |
| M5 | M4 complete; candidate/application uniqueness rechecked | interviews | 9 | 3 | 6 | `applicationId`, `positionId`, `recruiterId`; optional title | before images | all accepted rows reference existing consistent entities | High | YES |
| M6 | canonical notification schema approved | notifications | 17 | 4 | 13 | `receiver`, `userId`, `read`, `readAt`; preserve `status` | before images | zero missing recipients; business status unchanged | Medium | YES for 2 recipient rows |
| M7 | M2/M3 complete; owner decision for both identities | Firebase Auth + users | 2 | 0 | 2 | possible users doc or explicit keep/delete decision | Auth metadata + Firestore backup | every enabled Auth identity has documented disposition | High | YES |
| M8 | actual file-host manifest and retention policy | documents + ancillary file refs | 41 refs | 0 | 41 | URLs / storage metadata only after file verification | old refs + copied-file manifest | open/download/authorization checks | High | YES for file cutover |
| G1 | Phase 1C explicit Super revalidated | Rules/backend/routes/Admin UI/tests | 4 source layers + tests | 0 | 1 change set | remove legacy fallback logic | Phase 1D checkpoint | Emulator negative legacy-admin test + break-glass PASS | High | YES |

Recommended sequence: `M1A → M2 → M3 → M7 → M1B → M4 → M5 → M6 → M8 → G1 → fresh readiness scan → controlled Rules deploy`. M4 can run independently after its own fresh backup, but M5 depends on it.

## 12. Rollback Strategy

- Take a new sensitive export immediately before every approved migration; Phase 1C backup remains the baseline, not a substitute for a fresh pre-write snapshot.
- Generate an exact non-secret operation manifest containing document path، previous typed fields، proposed fields، `updateTime` precondition، operation ID، and checksum.
- Use deterministic/idempotent operations and bounded atomic batches. Abort on any precondition mismatch.
- Roll back only the affected fields from the immediately preceding snapshot and append a rollback audit record.
- Password cleanup is intentionally non-restorative: plaintext values remain only in the protected forensic backup and must never be written back to Production.
- Auth operations require separate before metadata and explicit per-UID approval. No automatic deletion is proposed.
- File migration keeps original references/files until every migrated file passes existence، authorization، MIME، size، preview، and download validation.

## 13. Post-migration Validation Plan

1. Assert zero recruiterRequests containing password-like field names.
2. Re-run exact request/Auth/users/university one-to-one matrix; no unresolved approved request may be activated implicitly.
3. Assert every recruiter users doc has valid role، active status، and canonical universityId.
4. Assert all 8 applications have `recruiterId == positions/{positionId}.postedBy.id`.
5. Assert every migrated interview points to an existing application, matching candidate, position, and recruiter; quarantine unresolved rows rather than guessing.
6. Assert zero notifications missing a canonical recipient; compare every business `status` before/after byte-for-byte.
7. Record an explicit disposition for both Auth orphans and verify enabled profiles can pass `active()` only when intended.
8. Reconcile file manifest against the actual production file host, not the empty local bundle.
9. Remove legacy fallback locally, add a negative legacy-admin test, then run Node 9/9، React 3/3، Emulator 21/21 or expanded matrix، and build.
10. Repeat a Production read-only readiness scan before requesting any Rules deploy.

## 14. Rules Deploy Readiness

**Decision: `STILL_BLOCKED`.**

After applying only current SAFE operations, applications become ownership-compatible، three interviews become complete، and two missing-recipient notifications become accessible. The deployment remains blocked by six unresolved interviews، unresolved recruiter/university/Auth cases، two Auth identities without users documents، eight approved password records awaiting reconciliation/removal، file-host uncertainty، and legacy Super Admin fallback still present in the validated local Rules/code. Dependency security and File API Production configuration remain separate release gates.

## 15. Dry-run Guardrails

- No Firestore document was created، updated، or deleted.
- No Auth user was created، updated، disabled، or deleted.
- No Rules were deployed and `.firebaserc` was unchanged.
- No password/token/secret value was printed or copied to documentation.
- No migration، file move، Local File API change، dependency fix، Git/GitHub، or Phase 2 work occurred.

## 16. Separately Approved M1A Execution Follow-up

After this dry run, M1A alone received explicit approval. The Phase 1C Production backup was verified again, followed by a limited sensitive local before-image backup outside the project. The only `REMOVE_ONLY` request (`Z494y…UO9G`) was revalidated as rejected with no Auth/users linkage, no provisioning dependency, and no workflow dependency. One atomic commit deleted only its `password` field and created a non-sensitive administrative audit record (`historical_sensitive_field_cleanup`).

Readback confirmed: the request still exists; its status and all non-sensitive fields are unchanged; the password field is absent; and the audit record contains the masked target, field name, reason, timestamp, and migration-tool actor without any prior value. The password-field presence count is `9 → 8`. M1B and every other remediation remain unexecuted. No Auth user, Rules, `.firebaserc`, application, interview, notification, file reference, or source-code change occurred.
