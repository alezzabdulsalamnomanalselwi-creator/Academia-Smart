# Phase 1E — Test Data Reset — Destructive Cleanup Dry Run

**التاريخ:** 2026-08-31  
**Firebase Project:** `my-project-51bb7`  
**الحالة:** `DRY_RUN_ONLY` — `NO_PRODUCTION_WRITES`  
**قرار التنفيذ:** `BLOCKED_PENDING_FRESH_PRE_DELETE_BACKUP_AND_SEPARATE_APPROVAL`

## 1. Executive Result

تم تنفيذ جرد حي للقراءة فقط عبر مشروع Production المحدد صراحة. حُدد Super Admin واحد بشكل قطعي وربط users document بحساب Auth المطابق. لم يدخل هذا المعرّف في أي قائمة حذف. البيانات الأخرى مُعلنة من مالك المشروع كبيانات اختبار، وبناءً على العلاقات الفعلية يمكن اقتراح حذف 208 مستندات Firestore و13 حساب Auth، أي 221 عملية حذف مستقبلية. لا يشمل هذا الرقم 85 سجلًا في `adminLogs` أو أي ملف فعلي.

لم ينفذ هذا الـDry Run أي حذف أو تحديث أو Rules deploy. التنفيذ الفعلي غير جاهز للبدء بعد: النسخة الكاملة الحالية سليمة لكنها تسبق عمليتي Phase 1C/M1A الإداريتين، كما أن استعادة Auth تتطلب `auth:export` حساسًا حديثًا قبل حذف أي حساب.

## 2. Protected Super Admin

### Protected Identity Record

| Field | Verified value |
|---|---|
| `PROTECTED_SUPER_ADMIN_UID` | `u7v3ZExhUnW17kwU2ecZ7IWgnxy2` |
| `PROTECTED_SUPER_ADMIN_USERS_DOC_ID` | `u7v3ZExhUnW17kwU2ecZ7IWgnxy2` |
| Email | `ad***@system.com` |
| Role | `admin` |
| Admin level | `super` |
| Permissions | `[*]` |
| Account status | `active` |
| Auth disabled | `false` |
| users document ID equals Auth UID | `true` |

قطعية الهوية مبنية على: وجود users document صريح واحد فقط يحمل `role=admin` و`adminLevel=super`، تطابق document ID مع Auth UID، تطابق البريد بين الطبقتين، الحساب غير معطل، والحالة ليست blocked/suspended. لا توجد هوية System Service مثبتة داخل Firebase Auth؛ الحسابات الثلاثة عشر الأخرى حسابات اختبار مرشحة للحذف المرتب فقط.

## 3. Backup Verification

| Backup/control | Result | Evidence |
|---|---|---|
| Latest source checkpoint | PASS/readable | `Academia-Smart-M1A-password-cleanup-20260831-0059-WIP.zip`; 138 entries |
| Source checkpoint SHA-256 | PASS | `1411DD45F2FE10C650E9A6D0E99935D9EA5BB2EF1F47F83F83B5325AFCDBD029` |
| Full Production backup | PASS | Phase 1C backup; 17 collection files / 292 records |
| Backup manifest | PASS | SHA-256 `C2721FFD92CC7136564E455AECA991882C54EE3790D48D3A71E6B46BA1CFC667` |
| Per-file checksums | PASS | 0 failures |
| `SENSITIVE-PRODUCTION-BACKUP` | PASS | موجود خارج المشروع وغير مدرج في checkpoint ZIP |
| M1A limited before image | PASS | محفوظ محليًا مع manifest/checksum؛ لم تُعرض القيمة الحساسة |
| Exact current pre-delete Firestore snapshot | REQUIRED BEFORE EXECUTION | النسخة الكاملة تسبق تغييري Super Admin/M1A؛ الحالة الحية الآن 294 مستندًا |
| Auth restorable export | REQUIRED BEFORE EXECUTION | Auth metadata وحدها لا تستعيد provider credentials/password hashes |

النسخ الموجودة سليمة وتكفي للتحليل، لكنها لا تمنح rollback دقيقًا للحذف المستقبلي حتى يُنشأ snapshot كامل حديث و`firebase auth:export` حساس في نافذة التنفيذ وبموافقة مستقلة.

## 4. Live Production Inventory

| Collection/entity | Count | Super Admin data? | Required for Super Admin login? | Classification | Relationship / evidence |
|---|---:|---|---|---|---|
| Firebase Auth | 14 | yes، 1 | yes | A: 1 protected; D: 13 ordered delete | Auth UID must remain paired with users doc |
| `users` | 12 | yes، 1 | yes | A: 1 protected; D: 11 ordered delete | Referenced by all recruitment/activity entities |
| `recruiterRequests` | 9 | no | no | D | Onboarding identity history; 8 still contain historical password field |
| `positions` | 13 | no | no | D | Referenced by applications/interviews/notifications; depends on recruiters/hierarchy |
| `jobs` | 0 | no | no | D/empty | Current implementation uses `positions` |
| `applications` | 8 | no | no | D | Depends on positions/users; referenced by interviews/documents/notifications |
| `documents` | 7 | no | no | D | Depends on users and sometimes applications; notification links exist |
| `interviews` | 10 | no | no | D | Depends on applications/positions/candidate/recruiter |
| `ratings` | 8 | no | no | D | Depends on lecturer/recruiter users |
| `notifications` | 94 | no | no | D | Leaf activity; includes 8 `recruiter_interest` records |
| `adminNotifications` | 6 | no | no | C | Legacy leaf collection; no current source-code reader/writer found |
| `verifications` | 24 | no | no | D | Depends on users; linked notification history |
| `universities` | 5 | no | no | D | Parent of colleges; referenced by users/requests/positions |
| `colleges` | 5 | no | no | D | Child of universities; parent of departments |
| `departments` | 5 | no | no | D | Child of colleges; parent of subjects |
| `subjects` | 3 | no | no | D | Child of departments; referenced by positions/users |
| `adminLogs` | 85 | no login credential | no | B: keep | Mixed historical and Phase 1 security evidence, including M1A |
| `auditLogs` | 0 | no | no | B/empty | Reserved audit entity |
| `savedJobs` | 0 / collection absent | no | no | C/empty | No live collection and no current code path found |
| standalone recruiter-interest collection | 0 / absent | no | no | C/empty | Recruiter interest is represented by 8 notification records |

Current Firestore total is 294 documents: keep 86 (`users` Super Admin + 85 `adminLogs`) and propose 208 test-document deletions. There are no non-empty unknown root collections after live `listCollectionIds` discovery.

## 5. Classification Summary

| Class | Scope | Count |
|---|---|---:|
| A — `PROTECTED_SUPER_ADMIN` | one Auth account + matching users document | 2 layer records / 1 identity |
| B — `REQUIRED_SYSTEM_CONFIGURATION` | retained security evidence in `adminLogs` | 85 |
| C — `TEST_DATA_SAFE_TO_DELETE` | legacy `adminNotifications` leaf records | 6 |
| D — `TEST_DATA_REQUIRES_ORDERED_DELETE` | remaining Firestore test records + non-protected Auth users | 202 Firestore + 13 Auth |
| E — `REVIEW_REQUIRED` database records | none | 0 |
| E — provider/file objects | external/unknown references; metadata may be removed but physical provider deletion is unproven | 29 reference entries |

The 29 file-review references are outside the 221 database/Auth deletion count. They require provider ownership and object identity verification before any physical cleanup.

## 6. Firebase Auth Keep/Delete Plan

### KEEP_AUTH

| UID | Email | State | Classification |
|---|---|---|---|
| `u7v3Z…nxy2` | `ad***@system.com` | enabled | `PROTECTED_SUPER_ADMIN` |

### DELETE_AUTH_CANDIDATE

| # | UID masked | Email masked | Disabled? |
|---:|---|---|---|
| 1 | `Ev4PA…S283` | `al***@gmail.com` | no |
| 2 | `JFzly…ybv1` | `le***@system.com` | no |
| 3 | `OK2dK…DMg1` | `am***@gmail.com` | no |
| 4 | `UqawM…D102` | `77***@gmail.com` | no |
| 5 | `Z2WbT…LWA2` | `al***@gmail.com` | no |
| 6 | `d0Lz4…lWw1` | `mm***@gmail.com` | no |
| 7 | `lQhnK…ry23` | `re***@example.com` | no |
| 8 | `mcElo…sZt2` | `al***@gmail.com` | no |
| 9 | `moX5T…GZr2` | `al***@gmail.com` | no |
| 10 | `mp0cw…Sil2` | `al***@gmail.com` | no |
| 11 | `n0BsX…Pxt2` | `al***@gmail.com` | no |
| 12 | `oNWlP…5Jy2` | `ad***@system.com` | no |
| 13 | `u0uXZ…IiZ2` | `al***@gmail.com` | no |

`PROTECTED_SUPER_ADMIN_UID` is not present in `DELETE_AUTH_CANDIDATE`. Auth deletion is blocked until a fresh restorable Auth export exists and every candidate is rechecked against the protected UID immediately before the operation.

## 7. Firestore Users Plan

Keep exactly the protected Super Admin users document. The 11 masked deletion candidates comprise 6 lecturers، 4 recruiters، and 1 non-super test admin. Four are explicitly active; missing legacy `accountStatus` values do not alter the owner’s test-data decision. Delete these profiles only after dependent Firestore data is gone and immediately before their matching Auth accounts.

| Keep | Delete | Protected IDs |
|---:|---:|---:|
| 1 | 11 | 1 |

## 8. Academic Data Plan

All 18 academic records are test data: 5 universities، 5 colleges، 5 departments، and 3 subjects. Because positions and profiles reference academic IDs, remove recruitment records and test profiles first where appropriate. Within the hierarchy, the safe order is:

`subjects (3) → departments (5) → colleges (5) → universities (5)`

Firestore does not enforce foreign keys, but this order avoids transient orphan parents/children and matches the actual fields `departmentId → collegeId → universityId`.

## 9. Recruitment and Activity Data Plan

Core recruitment deletion candidates are 30 records: 9 recruiter requests، 13 positions، and 8 applications. Activity candidates are 149 records: 94 notifications، 6 admin notifications، 24 verifications، 7 documents، 10 interviews، and 8 ratings. `jobs` is empty; standalone saved-job and recruiter-interest collections are absent. The eight recruiter-interest events are included within the 94 notifications.

M1B/M2/M3 reconciliation is superseded only if the separately approved reset is actually executed: deletion of all nine recruiter requests would remove the eight remaining password-bearing test records. Until then, their P0 status remains open.

## 10. Local Files and External References

The local `server/uploads` directory exists and contains 0 files. Current metadata contains 44 file-bearing/reference fields:

| Reference class | Reference count | Interpretation |
|---|---:|---|
| Local File API missing | 12 refs / 3 unique filenames | No local file exists; metadata is test data |
| Cloudinary | 10 | External object ownership/deletion not proven |
| Google Drive | 4 | External object ownership/deletion not proven |
| Other external | 14 | External URL; do not delete provider object automatically |
| Unknown URL/value | 1 | Review before physical cleanup |
| Unknown `storagePath` metadata | 3 | Metadata paired with document records, not counted as separate files |

Deleting test Firestore metadata later does not authorize deletion from Cloudinary، Drive، or another provider. External objects stay `REVIEW_REQUIRED`; the project source، sensitive backups، and any real file remain excluded.

## 11. Audit Log Policy

Recommendation: retain all 85 `adminLogs` through the reset. They contain mixed historical test actions and Phase 1 security evidence, including explicit Super Admin readiness and M1A cleanup. The current schema does not provide a sufficiently reliable immutable tag to delete only old test events without risking security-history loss.

For a visibly clean test era, use the reset completion timestamp as an audit boundary and filter reports by that timestamp. A later separately approved archival phase may export logs to a checksummed sensitive archive, copy a non-sensitive Phase 1 security chronology into documentation, classify each log, and then remove only proven test-only rows. `auditLogs` is already 0.

## 12. Clean Reset Target State

| Layer/entity | Target immediately after cleanup |
|---|---:|
| Firebase Auth | 1 protected Super Admin |
| `users` | 1 protected Super Admin document |
| `adminLogs` | 85 retained minimum; reset audit entries may increase this |
| `recruiterRequests` | 0 |
| `positions` / `jobs` | 0 / 0 |
| `applications` | 0 |
| `documents` | 0 |
| `interviews` | 0 |
| `ratings` | 0 |
| `notifications` / `adminNotifications` | 0 / 0 |
| `verifications` | 0 |
| universities / colleges / departments / subjects | 0 / 0 / 0 / 0 temporarily |
| saved jobs / standalone recruiter interests | 0 / 0 |

Only Auth=1 and `users`=1 are required for application login. `adminLogs` should remain non-zero for security governance. No discovered Firestore system-config collection must be non-zero. Empty academic collections are operationally valid as a temporary state, but signup/job selectors will intentionally have no options until seed data is created.

## 13. Fresh Synthetic Seed Plan — Design Only

| Entity | Planned count | Synthetic naming / coverage |
|---|---:|---|
| Existing Super Admin | 1 | Preserve current identity; never reseed |
| Limited Admin | 1 | `Test Limited Admin 01`; explicit permission subset |
| Recruiters | 2 | `Test Recruiter 01/02`; each linked to a test university |
| Lecturers | 3 | `Test Lecturer 01/02/03`; complete، partial، and minimal profiles |
| Universities | 2 | `Test University A/B` / `جامعة اختبار أ/ب` |
| Colleges | 3 | Distributed 2+1 across universities |
| Departments | 4 | Distributed across colleges |
| Subjects | 6 | Stable codes covering CS/IT/AI-like paths |
| Positions | 3 | open، draft، closed; online/on-site and employment-type variants |
| Applications | 5 | pending، reviewing، shortlisted/accepted، rejected، withdrawn-like path |
| Documents | 4 | pending، approved، rejected، requested/new upload |
| Interviews | 3 | online scheduled، in-person rescheduled، completed |
| Notifications | scenario-generated | unread/read، each deep-link target، deterministic eventKey |
| Ratings | 2 | two recruiter/lecturer relationships |
| Recruiter requests | workflow-generated | approval success plus rejection-without-account case |

The seed must use unmistakably synthetic emails/names, deterministic IDs where supported, no real personal data, no plaintext password in Firestore, and a cleanup namespace/tag such as `datasetId=phase1e-seed-v1` where schema and Rules allow it.

## 14. End-to-End Test Plan After Reset

1. Recruiter signup → pending request → approval → Auth/users activation → login; also reject a separate request and assert no account creation.
2. Create University → College → Department → Subject; verify inactive-parent selectors, duplicate prevention, and safe delete.
3. Publish three positions and verify recruiter ownership/table/report outputs.
4. Confirm lecturers see only eligible open positions and submit applications.
5. Verify application notification, unread badge, idempotent eventKey, and application deep link.
6. Upload a document through Local File API; verify 25MB/MIME limits, preview/download, recruiter notification, review note, lecturer result, and document deep link.
7. Schedule/reschedule/complete/cancel/no-show interviews; test online link، location، conflict prevention، and exact application/position relation.
8. Create ratings and validate access/aggregation.
9. Exercise every notification deep link and read/unread transition without duplicate delivery.
10. Generate academic/recruitment reports and validate PDF، Print، CSV/Excel outputs.
11. Exercise Hybrid AI cloud/fallback helpers as suggestions only; no automatic employment decision.
12. Validate Limited Admin UI، route، backend action، and Firestore-rule denial; revalidate Super Admin protection.

## 15. Safe Delete Order

| Stage | Ordered scope | Reason |
|---|---|---|
| D0 — safety gate | maintenance window; fresh Firestore backup; restorable Auth export; re-read protected UID; abort on mismatch | Prevent concurrent writes and guarantee rollback |
| D1 — leaf activity | `notifications` → `adminNotifications` → `ratings` | Remove leaf references first |
| D2 — dependent workflows | `interviews` → `documents` → `verifications` | These depend on users/applications/positions |
| D3 — applications | `applications` | Remove before jobs/users |
| D4 — recruitment roots | `positions` → `jobs` → `recruiterRequests` | Positions depend on recruiters/hierarchy; requests carry historical fields |
| D5 — academic hierarchy | `subjects` → `departments` → `colleges` → `universities` | Child-to-parent order |
| D6 — Firestore identities | all `users` except exact protected document | Dependents already removed; protected assertion repeated |
| D7 — Auth identities | 13 candidates except exact protected UID | Last and separately guarded because rollback is hardest |
| D8 — validation | recount all target collections; login as Super Admin; open Admin Dashboard and Accounts/Permissions | Prove target state and break-glass continuity |

`adminLogs` is excluded from every delete stage. Physical files/provider objects are also excluded.

## 16. Rollback Plan

| Stage | Backup source required | Expected delete count | Rollback method | Validation | Current readiness |
|---|---|---:|---|---|---|
| D1 | fresh Firestore before images | 108 | restore exact documents with original IDs/types | counts + reference/read-state sample | NO — fresh snapshot required |
| D2 | fresh Firestore before images | 41 | restore verifications/documents/interviews after parent records | relationship/readback checks | NO — fresh snapshot required |
| D3 | fresh Firestore before images | 8 | restore applications with original IDs | position/applicant relation checks | NO — fresh snapshot required |
| D4 | fresh Firestore before images | 22 | restore requests/jobs/positions; never use password values for login | ownership + password-field containment check | NO — fresh snapshot required |
| D5 | fresh Firestore before images | 18 | restore parent-to-child: universities → colleges → departments → subjects | hierarchy integrity counts | NO — fresh snapshot required |
| D6 | fresh Firestore before images | 11 | restore users docs only after corresponding Auth identities exist | UID/role/status/university checks | NO — fresh snapshot required |
| D7 | fresh `firebase auth:export` with protected storage | 13 | controlled `auth:import` preserving UID/provider hashes, then users restore | Auth/users one-to-one + disabled/provider checks | NO — Auth export required |

Rollback order is the reverse of deletion dependencies. The existing Phase 1C backup and M1A limited backup are verified evidence but are not a substitute for a single exact current pre-delete snapshot. Therefore every destructive stage is `BLOCKED` today.

## 17. Risks and Gates

- P0 deployed Firestore Rules still permit public full CRUD. A reset window without write freeze/preconditions could race with external writes.
- Accidental inclusion of the protected UID is catastrophic; every batch must hard-fail if it contains either protected Auth UID or protected users doc ID.
- Auth deletion is not safely reversible from metadata alone; a sensitive restorable export is mandatory.
- Full current backup differs from Phase 1C backup because Super Admin promotion and M1A audit/cleanup occurred afterward.
- External provider objects may not belong to the local reset operator; metadata cleanup and physical deletion are separate decisions.
- Deleting academic data temporarily empties signup/job selectors until seed creation.
- Deleting old requests removes the remaining eight historical password fields, but that security issue remains open until execution and verified recount.
- Audit evidence must not be deleted as ordinary test data.

## 18. Super Admin Safety Assertion

```text
SUPER_ADMIN_DELETE_CANDIDATE_COUNT = 0
SUPER_ADMIN_PROTECTED = TRUE
```

The dry-run plan is safe with respect to candidate classification, but destructive execution remains blocked by the fresh-backup/Auth-export gate and requires separate explicit approval.

## 19. No-Writes Assertion

```text
deleteDoc = 0
updateDoc = 0
setDoc = 0
Auth delete = 0
Auth disable = 0
Rules deploy = 0
file delete = 0
```

No `.firebaserc` change، source-code change، Git/GitHub operation، migration، or Phase 2 work occurred. The only local writes are the sensitive read-only analysis artifacts outside the project and the documentation/checkpoint required by Phase 1E.

