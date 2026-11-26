# Phase 1F — Verified Production Backup & Restore Readiness

**التاريخ:** 2026-08-31  
**Production project:** `my-project-51bb7`  
**Firebase CLI account:** `mm***@gmail.com`  
**الوضع:** Backup/export reads only; no Production writes  
**Final readiness:** `RESTORE_READY_FOR_TEST_DATA_RESET`

## 1. Outcome

تم إنشاء نسخة Production حساسة وحديثة خارج source tree. Firestore backup كامل ومتطابق: 294/294 مستندًا، وAuth export الرسمي يحتوي 14/14 حسابًا. يوجد Super Admin في نسختي Auth وFirestore، و85/85 من `adminLogs` موجودة. جميع checksums والـmanifests المحلية المطابقة اجتازت التحقق.

تم إغلاق مانع Java/Firestore Emulator: ثُبّت Microsoft OpenJDK `21.0.12.1 LTS` بصورة portable خارج source tree، مع إبقاء Java القديم `1.8.0_05` وإعداد `JAVA_HOME/PATH` لعملية Emulator فقط. بدأ Firestore/Auth Emulator محليًا، واستُعيدت 294/294 وثيقة Firestore مع تطابق كل collection path والقيم typed، كما استُعيدت بنية 14/14 حساب Auth مع UIDs الأصلية ووجود Super Admin.

حُفظت معاملات Firebase Password Hash محليًا داخل النسخة الحساسة فقط، واجتازت فحص الصيغة دون عرضها. استيراد Auth المشفّر إلى Auth Emulator نجح لـ14/14 حسابًا مع UIDs وemail/disabled/provider metadata وSuper Admin. لا توجد كلمة مرور اختبار آمنة، لذلك `PASSWORD_LOGIN_TEST = NOT_TESTED_NO_SAFE_TEST_CREDENTIAL`؛ وهذا ليس مانعًا وفق شرط المرحلة لأن الاستيراد الرسمي بالحسابات الأصلية والإعدادات الصحيحة اجتاز.

الحالة الآن `RESTORE_READY_FOR_TEST_DATA_RESET`. هذا يثبت الاستعداد فقط؛ لا يجيز بدء Test Data Reset. يبقى أي Reset أو حذف أو تغيير Production محتاجًا موافقة منفصلة وصريحة.

## 2. Production Target Verification

| Check | Result |
|---|---|
| Explicit project ID | `my-project-51bb7` — PASS |
| Authorized CLI account | registered browser-login account — PASS |
| Firestore/Auth emulator environment variables before export | absent |
| Active Firebase Emulator process before export | 0 |
| Production API/CLI commands | explicitly targeted `my-project-51bb7` |
| `.firebaserc` | unchanged; SHA-256 `C2F97ADEC9504B58900B62658E000EEAB5CFA588A1D62A057F0EF31403A5B13C` |
| Active Firebase Emulator process after validation | 0 |

No managed Firestore export was started. The managed service requires a Cloud Storage bucket and produces a remote export; the project policy requires a local-only sensitive backup. Firebase also documents that managed exports are not exact start-time snapshots. A recursive raw typed-JSON local export with a second live-count pass was therefore used. See [Firestore export/import documentation](https://firebase.google.com/docs/firestore/manage-data/export-import).

## 3. Sensitive Backup Scope and Location

Backup root:

`SENSITIVE-PRODUCTION-BACKUP/my-project-51bb7/phase-01f-20260831-0140-R2/`

The directory is outside the source project and contains:

- recursive raw Firestore typed-JSON files, including all fields;
- Firestore collection/count/checksum manifest;
- official Firebase CLI Auth JSON export;
- locally stored Password Hash configuration (sensitive file; never documented or added to the project ZIP);
- sensitive full file-reference inventory;
- Auth Emulator structural test result;
- full Firestore Emulator restore and integrity results;
- Java compatibility metadata without modifying the system Java;
- non-sensitive root backup manifest and checksums;
- `BACKUP-SECURITY-NOTICE.txt`.

No `.env`، service-account key، private-key file، or source file is included. The directory is excluded from the project checkpoint.

## 4. Firestore Backup Method

The backup tool used Firebase CLI browser-login OAuth and Firestore REST reads only. It:

1. called root `listCollectionIds` against the explicit Production project;
2. listed every document using raw Firestore typed JSON without decoding or dropping fields;
3. called `listCollectionIds` for every discovered document to find nested subcollections;
4. included known empty/legacy collection names for zero-count verification;
5. wrote one checksummed file per collection path;
6. repeated discovery and counts after export;
7. failed closed if root collections or any collection count changed.

No nested subcollection containing records was discovered. Fifteen root collections exist; the manifest tracks 20 actual/expected collection paths including five zero-count collections.

## 5. Firestore Count Verification

| Collection | Production Count | Backup Count | Match |
|---|---:|---:|---|
| `adminLogs` | 85 | 85 | YES |
| `adminNotifications` | 6 | 6 | YES |
| `applications` | 8 | 8 | YES |
| `auditLogs` | 0 | 0 | YES |
| `colleges` | 5 | 5 | YES |
| `departments` | 5 | 5 | YES |
| `documents` | 7 | 7 | YES |
| `interviews` | 10 | 10 | YES |
| `jobs` | 0 | 0 | YES |
| `notifications` | 94 | 94 | YES |
| `positions` | 13 | 13 | YES |
| `ratings` | 8 | 8 | YES |
| `recruiterInterest` | 0 | 0 | YES |
| `recruiterInterests` | 0 | 0 | YES |
| `recruiterRequests` | 9 | 9 | YES |
| `savedJobs` | 0 | 0 | YES |
| `subjects` | 3 | 3 | YES |
| `universities` | 5 | 5 | YES |
| `users` | 12 | 12 | YES |
| `verifications` | 24 | 24 | YES |
| **TOTAL** | **294** | **294** | **YES** |

Firestore manifest SHA-256: `CB49BEC6A90AB01DCDC1BEDE95ADA8F49D3634CD56E3AE40E7164E71ADD4CC95`. Collection-file checksum failures: 0.

## 6. Firebase Authentication Export Verification

The official command class was Firebase CLI `auth:export` with JSON format, explicit project, and explicit account. Firebase CLI version: `14.27.0`.

| Check | Result |
|---|---|
| Production Auth count reported by export | 14 |
| Exported users count | 14 |
| Unique exported UIDs | 14 |
| Count match | YES |
| Super Admin UID present exactly once | YES |
| Records containing password hash field | 14; values never printed/documented |
| Records containing salt field | 14; values never printed/documented |
| Auth export SHA-256 | `C083DAAFFC1D3D074B29446401AF8C4443BB1EC9F3581B6168E13E8971F32C8A` |
| Firebase SCRYPT parameters captured | YES — sensitive local file only |
| Password hash configuration file present | YES |
| Password hash configuration valid | YES |

Firebase states that importing Firebase SCRYPT password hashes requires project-specific hash parameters; hashes and salts alone are insufficient. The required configuration is now saved only in the sensitive backup and was passed to a local Auth Emulator import without appearing in terminal output، documentation، source code، or the project ZIP. See [Firebase Auth CLI documentation](https://firebase.google.com/docs/cli/auth) and [Admin SDK import-users documentation](https://firebase.google.com/docs/auth/admin/import-users).

## 7. Protected Super Admin Assertions

```text
SUPER_ADMIN_AUTH_BACKED_UP = TRUE
SUPER_ADMIN_FIRESTORE_BACKED_UP = TRUE
```

The protected UID is present in Auth export and its exact `users` document is present with `role=admin` and `adminLevel=super`. The report masks the identifier as `u7v3Z…nxy2`; the sensitive manifest performs the exact comparison.

## 8. Admin Logs

Current Production `adminLogs`: 85. Backed up: 85. Count match: YES. These logs remain excluded from the future reset deletion plan but are backed up for governance and incident recovery.

## 9. File Reference Snapshot

The complete values are stored only in `FILE-REFERENCE-INVENTORY-SENSITIVE.json`. Documentation contains counts only.

| Reference class | Count | Note |
|---|---:|---|
| Local File API missing | 12 references / 3 unique filenames | `server/uploads` contains 0 files |
| Cloudinary | 10 | Metadata snapshot only |
| Google Drive | 4 | Metadata snapshot only |
| Other external | 14 | Metadata snapshot only |
| Unknown | 4 | Includes storage-path metadata/unknown reference |
| Total reference fields | 44 | Values retained only in sensitive backup |

No local or external file was downloaded، uploaded، modified، or deleted.

## 10. Firestore Restore Plan

Restore is designed for a separately approved recovery window using Admin SDK or Firestore REST:

1. Verify the destination is `my-project-51bb7`, enable a maintenance window, and re-verify Super Admin protection.
2. Verify root manifest and every collection-file checksum before reading payloads.
3. Restore the protected users document first if missing; do not overwrite a healthy Super Admin without an explicit incident decision.
4. Restore academic parents in order: universities → colleges → departments → subjects.
5. Restore other users/recruiter requests and positions/jobs.
6. Restore applications → documents/verifications/interviews/ratings → notifications/adminNotifications.
7. Restore `adminLogs` only if lost; otherwise compare and append/merge according to the incident boundary.
8. Use the full captured document path as the destination, preserving document IDs and nested collection paths.
9. Submit each raw `fields` object without type coercion. Firestore `timestampValue` and `referenceValue` fields stay typed and unchanged.
10. Use create/update-time preconditions and an operation manifest to avoid overwriting unexpected current data.

Limitation: application fields containing timestamps are preserved, but Firestore system metadata `createTime`/`updateTime` cannot be forced to their old server values by an ordinary document write. Managed Firestore import would preserve captured IDs and offers a supported bulk-recovery path, but requires Cloud Storage and a separately authorized cloud export/import workflow.

## 11. Firebase Auth Restore Plan

The official restoration path is Firebase CLI `auth:import` or Admin SDK `importUsers()` against the explicit target. It must:

1. verify the sensitive Auth export checksum and 14 unique `localId` values;
2. obtain and locally store the original project's SCRYPT signer key، salt separator، rounds، and memory cost without exposing them in terminal/docs;
3. import deleted users with the original UID، email، provider data، disabled state، custom claims، password hash، and salt;
4. supply the original SCRYPT parameters through a protected helper rather than exposing the signer key in command history/process arguments;
5. reject UID/email collisions and verify per-user import errors;
6. restore matching Firestore users documents after Auth identities exist;
7. compare Auth count/UID set and perform controlled login tests.

Without the original SCRYPT parameters, accounts can be recreated structurally or forced through password reset, but existing passwords cannot be considered restored. That is not equivalent rollback readiness.

## 12. Super Admin Emergency Restore

If a future reset damages the protected identity:

1. stop the reset immediately and retain all operation logs;
2. verify the exact protected UID against the sensitive manifest;
3. if Auth still exists, restore only the corresponding raw Firestore users document and verify `role`، `adminLevel`، permissions، status، and email parity;
4. if Auth is missing, do not create a different UID; import the exact Auth entry with its original UID and SCRYPT parameters, then restore the users document;
5. verify Auth enabled state and users document readback;
6. perform manual login، Admin Dashboard، and Accounts/Permissions validation;
7. do not resume reset until `BREAK_GLASS_READY` is re-established.

The protected configuration is now available locally, so a future approved recovery can preserve original Auth UIDs and password-compatible import behavior.

## 13. Restore Validation

| Test | Result | Evidence/limitation |
|---|---|---|
| Java compatibility | PASS | old `1.8.0_05` retained; portable Microsoft OpenJDK `21.0.12.1 LTS` used only through Emulator process environment |
| Firestore/Auth Emulator startup | PASS | local demo project `demo-academia-smart-phase1a`; Firestore `8180`، Auth `9199`; stopped after validation |
| Firestore full restore to Emulator | PASS | 294/294; every collection-path count matched; raw typed fields، document IDs، references، and application timestamps matched |
| Firestore relationship/integrity sanity checks | PASS | Super Admin users document present؛ adminLogs 85/85؛ academic hierarchy and available application/position/interview/notification references checked; historical unresolved relationships preserved as-is and not repaired |
| Auth structural restore to demo Auth Emulator | PASS | 14/14 UIDs imported; 14 unique; original UIDs، emails، disabled/provider metadata preserved; Super Admin UID present; 0 Production writes |
| Auth password-hash configuration restore | PASS | SCRYPT configuration + hashes/salts imported into Auth Emulator; 14/14 users; UIDs and email/disabled/provider metadata matched; Super Admin present |
| Password login | `NOT_TESTED_NO_SAFE_TEST_CREDENTIAL` | no known safe test credential was used; no Super Admin password was requested or tested |
| Production restore | NOT_RUN | explicitly prohibited |

After any real restore, verify: per-collection counts، Auth count and UID set، exact Super Admin Auth/users pairing، adminLogs count، academic hierarchy، position/application ownership، interview relationships، notification recipients/deep links، document metadata، and manual Super Admin login.

## 14. Backup Security Verification

| Control | Result |
|---|---|
| Backup outside source tree | PASS |
| Local only | PASS |
| Excluded from project ZIP | PASS |
| `.env` included | NO |
| Service-account/private-key file included | NO |
| Auth export marked sensitive | YES |
| Security notice present | YES |
| Root manifest sidecar checksum matches | YES |
| Root manifest SHA-256 | `6652023E2B9B6392D53AB497D4E4BE2C3B6D9426B049A72181626CEBE8234EB7` |
| Listed backup-file checksum failures | 0 |
| Git/GitHub used | NO |

## 15. Risks and Blockers

- Raw REST export is verified by two-pass counts/checksums but is not a managed transactional snapshot; Firestore itself notes managed exports can also include changes made during the export.
- Firestore system create/update metadata is not directly restorable through ordinary document writes.
- External file references are backed up as metadata only; provider objects are not locally backed up.
- Production Rules remain public full CRUD and are not changed by this phase.

## 16. Final Readiness

```text
RESTORE_READY_FOR_TEST_DATA_RESET
```

Firestore 294/294 and Auth 14/14 restoration now pass locally, with all Super Admin assertions true and a valid protected Password Hash configuration. A project checkpoint is created for this state. Test Data Reset remains prohibited until a separate explicit approval.

## 17. No Production Writes Assertion

```text
deleteDoc = 0
updateDoc = 0
setDoc = 0
Auth delete = 0
Auth update = 0
Rules deploy = 0
Test Data Reset = 0
Seed Data creation = 0
```

Only Production reads/exports and local sensitive-backup/Emulator/documentation writes occurred. No Phase 2 work occurred.
