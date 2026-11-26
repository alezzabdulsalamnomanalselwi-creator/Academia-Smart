# Phase 1B — Production Readiness Gate (Read Only)

**التاريخ:** 2026-08-30  
**المشروع:** `my-project-51bb7`  
**الحساب المستخدم:** `mm***@gmail.com`  
**Firestore database:** `(default)`  
**السياسة:** Production READ ONLY. لم يحدث deploy أو write أو migration أو Auth mutation أو Custom Claims change. لم تتغير `.firebaserc`.

> **Phase 1C follow-up — 2026-08-30:** أُنشئت نسخة Production محلية موثقة، ثم رُقّي Legacy Admin الوحيد ذريًا إلى explicit Super Admin (`adminLevel=super`, `permissions=['*']`, `accountStatus=active`) مع Audit record وreadback ناجحين. Auth موجود ومفعّل، واختبار الدخول اليدوي ولوحة الإدارة وصفحة الحسابات/الصلاحيات نجحت؛ الحالة الحالية `BREAK_GLASS_READY`. بقية قرار هذا التقرير وموانع النشر قائمة؛ خصوصًا Production Rules العامة وحقول password التاريخية. راجع `docs/phase-01/PHASE-01C-PRODUCTION-SAFETY.md`.

## Executive Decision

**C. MIGRATION_REQUIRED_BEFORE_DEPLOY**

القواعد المحلية اجتازت Phase 1A، لكن نشرها بصورتها الحالية سيغلق تعرضًا عامًا خطيرًا وفي الوقت نفسه سيجعل سجلات تاريخية غير متوافقة غير مرئية أو غير قابلة للمعالجة. لا يوجد Super Admin صريح؛ الحساب الإداري الوحيد يعتمد legacy fallback. توجد أيضًا 9 طلبات recruiter تحمل حقل password تاريخيًا، و8 طلبات approved بلا حساب recruiter قابل للاستخدام، و8 applications بلا `recruiterId`، و6 interviews بلا `recruiterId`. لذلك deploy الحالي محجوب إلى أن تنفذ migrations أمنية معتمدة أو rules انتقالية تُختبر بنفس بيانات Production الشكلية.

## 1. Production Access Evidence

- Firebase CLI 14.27.0، الحساب المحدد رسميًا عبر `--account mmaa7796678@gmail.com`.
- `projects:list --account ... --project my-project-51bb7 --json`: PASS؛ المشروع ظاهر.
- Firestore Rules API GET: PASS.
- Firestore documents list GET: PASS.
- Firebase Auth `accounts:batchGet`: PASS.
- لم تُطبع access/refresh tokens أو كلمات مرور أو service-account material.

## 2. Current Production Rules vs Local Validated Rules

### Current Production Rules

Ruleset: `projects/my-project-51bb7/rulesets/7702bc25-f0c4-4889-93e3-6395ee05f256`

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

هذه القواعد تمنح قراءة وكتابة عامة حتى دون Authentication لكل collection/document. التصنيف **P0 Critical**. SHA-256 للمحتوى المقروء: `9B8C04446F4D7FE4B19F36807C79A56FC2A8882467E92752FFFFE83F335FD0A9`.

### Local Validated Rules

- الملف: `firestore.rules`.
- SHA-256: `F7203F6A38BB7060AE1C14903890477C630870AC9B434BE01DA42D68A15FBBA7`.
- Phase 1A Emulator: 21/21 PASS؛ إجمالي regression 33/33 PASS.
- deny-by-default، profile status/role/permission checks، ownership، protected admin fields، read-only notification state، وحماية Super Admin.

### Behavioral Diff

| Area | Production State | Local Validated State | Difference / Risk |
|---|---|---|---|
| Catch-all | `allow read, write: if true` | `allow read, write: if false` | إغلاق كامل للوصول غير المصرح؛ P0 exposure حاليًا |
| Authentication | غير مطلوب | profile + active account مطلوبان لمعظم البيانات | sessions بلا users doc والحسابات المحظورة ستُرفض |
| Users/RBAC | أي شخص full CRUD | self profile allowlist؛ security عبر backend | يمنع self escalation والتلاعب بالأدوار |
| Super Admin | لا حماية | explicit أو legacy fallback؛ target protection | Production يعتمد legacy فقط؛ deployment safety غير مكتملة |
| Applications | أي شخص full CRUD | applicant أو recruiter مالك position أو admin | 8/8 بلا recruiterId؛ fallback position يدعم القراءة جزئيًا |
| Documents | أي شخص full CRUD | userId/recruiterId ownership | 7/7 تحتوي العلاقات المطلوبة |
| Interviews | أي شخص full CRUD | candidateId/recruiterId relations | 6/10 بلا recruiterId؛ ستختفي عن recruiter ownership queries |
| Ratings | أي شخص full CRUD | lecturer/recruiter relations؛ immutable | 8/8 تحتوي العلاقات الأساسية |
| Notifications | أي شخص full CRUD | receiver/sender read؛ receiver `read/readAt` فقط | 2/94 بلا recipient؛ 15 تمزج business status مع read state |
| Recruiter requests | أي شخص full CRUD | admin `requests.manage` read؛ writes backend-only | كل 9 legacy بلا authUid؛ workflow الجديد لا يعتمدها تلقائيًا |
| Admin logs | أي شخص full CRUD | admin create؛ `audit.view` read؛ no update/delete | يمنع tampering بعد deploy |
| Unknown collections | عامة | denied | أي feature غير موثق سيتوقف حتى يضاف rule صريح |

## 3. Break-Glass / Super Admin

**النتيجة وقت فحص Phase 1B: `BREAK_GLASS_NOT_READY`**

| Check | Result |
|---|---|
| Explicit Super Admin (`adminLevel=super` أو `isSuperAdmin=true`) | 0 |
| Legacy fallback admin | 1 |
| Masked UID | `u7v3Z…nxy2` |
| Auth identity | موجود ومفعّل |
| users document / role | موجود / `admin` |
| adminLevel | MISSING |
| accountStatus/status | MISSING |
| permissions | MISSING |
| blocked/paused | لا يوجد field يدل عليه |

القواعد المحلية تدعم هذا الحساب مؤقتًا كlegacy Super Admin، لكن سياسة النشر تتطلب هوية صريحة وحالة نشطة وصلاحيات موثقة قبل deploy. لا يُوصى بالنشر اعتمادًا على fallback وحده.

## 4. Production Data Compatibility Counts

### Collection Inventory

| Collection | Count |
|---|---:|
| users | 12 |
| recruiterRequests | 9 |
| joinRequests | 0 |
| applications | 8 |
| documents | 7 |
| interviews | 10 |
| ratings | 8 |
| notifications | 94 |
| positions | 13 |
| jobs | 0 |
| universities / colleges / departments / subjects | 5 / 5 / 5 / 3 |
| adminLogs | 83 |
| auditLogs | 0 |

### Schema Compatibility

| Entity | Finding | Count | Deploy impact |
|---|---|---:|---|
| users | missing role | 0 | none |
| users | missing both status/accountStatus | 8 | allowed by temporary compatibility؛ migration still recommended |
| users | legacy role values | 0 | none |
| users | duplicate email docs | 0 | none observed |
| recruiters | users role recruiter | 4 | inventory |
| recruiters | missing universityId | 4 | provisioning/data integrity blocker |
| recruiterRequests | missing authUid | 9/9 | legacy approval cannot use secure workflow |
| recruiterRequests | approved | 8 | historical state |
| recruiterRequests | approved without usable active recruiter account | 8/8 | confirmed historical false approval/inconsistency |
| applications | missing recruiterId | 8/8 | migration required؛ ownership falls back to position for some reads only |
| applications | missing applicant owner | 0 | compatible |
| documents | missing user owner | 0 | compatible |
| documents | missing recruiterId | 0 | compatible |
| documents | URL references | 7 | 3 external، 3 local protected، والباقي provider/format آخر |
| interviews | missing applicationId | 9/10 | historical relation incomplete |
| interviews | missing positionId/jobId | 9/10 | explains undefined job/title behavior |
| interviews | missing recruiterId | 6/10 | recruiter ownership access will exclude these rows |
| interviews | missing candidate relation | 0 | lecturer relation present |
| ratings | missing recruiterId / lecturerId | 0 / 0 | compatible |
| notifications | missing all recognized recipient fields | 2/94 | inaccessible to intended recipient under new Rules |
| notifications | receiver map / userId / legacy receiverId | 74 / 36 / 8 | overlapping historical schemas supported by Rules |
| notifications | read field + business status mixed | 15 | schema migration recommended |
| positions/jobs | actual collection | 13 positions / 0 jobs | code and data agree on `positions` |
| positions | missing owner | 0 | compatible |

## 5. Historical Plaintext Password Scan

لم تُقرأ أو تُعرض أو تُنسخ قيمة أي حقل حساس. تم عدّ وجود أسماء الحقول فقط.

| Collection | Field | Affected records | Severity |
|---|---|---:|---|
| recruiterRequests | password | 9 | **P0 — HISTORICAL PLAINTEXT PASSWORD DATA** |
| recruiterRequests | plainPassword | 0 | — |
| recruiterRequests | plaintextPassword | 0 | — |
| recruiterRequests | tempPassword | 0 | — |

## 6. Firebase Auth vs Firestore Users

| Check | Count | Evidence / impact |
|---|---:|---|
| Firebase Auth users | 14 | Auth metadata GET |
| Firestore users docs | 12 | Firestore GET |
| Auth user without users doc | 2 | masked: `lQhnK…ry23`, `mcElo…sZt2` |
| users doc without Auth identity | 0 | consistent |
| duplicate Auth emails | 0 | none observed |
| Auth disabled + Firestore active | 0 | consistent |
| Firestore blocked/paused + Auth enabled | 0 | none observed |
| recruiter profile missing universityId | 4 | all recruiter profiles affected |
| approved recruiter request without usable account | 8 | reconciliation required |

## 7. Query Compatibility with New Rules

| Component | Collection | Current query | Required filter | Will break after deploy? | Severity | Recommendation |
|---|---|---|---|---|---|---|
| ViewPositions / TrackApplications | positions/applications | `status=open`; `applicantId=uid` | same | NO | — | compatible |
| ViewApplications | positions/applications | owner positions ثم `positionId` | owned position | NO | — | compatible; retain fallback until backfill |
| ManagePositions | positions/applications | `postedBy.id=uid`; per-position applications | same | NO | — | compatible |
| ManageInterviews | interviews | `recruiterId=uid` | same | **YES, historical rows** | P1 | backfill 6 missing recruiterId and 9 missing relations |
| ReviewDocuments | documents | `recruiterId=uid` | same | NO | — | all 7 docs have relationship |
| UploadDocuments | applications/users | applicantId+approved؛ users role recruiter | same | PARTIAL | P1 | backfill application recruiterId؛ approved recruiter badge currently resolves undefined |
| ViewLecturers | users/ratings | role lecturer؛ recruiterId+lecturerId | same | NO | — | compatible |
| Lecturer Notifications / Context | notifications | receiver.id and userId queries | receiver/owner | PARTIAL | P2 | repair 2 rows without recipient; legacy receiverId consumer coverage |
| Recruiter Notifications | notifications | receiver.id + type | receiver | PARTIAL historical | P2 | normalize recipient field; Rules support legacy receiverId but component does not query it here |
| RequestRatings | notifications | sender.id=current + receiver.id + status | sender/receiver | NO | — | compatible with sender ownership rule |
| Profile | users/academic | own doc؛ users role recruiter؛ academic lists | role filter / active account | NO | — | compatible |
| PostPosition | academic/users/positions | academic lists؛ users role lecturer؛ own positions | role/owner filters | NO | — | compatible |
| AdminDashboard | users/requests/logs/academic | broad lists gated by UI permission | permission-independent rule check | NO for legacy admin | P1 safety | migrate explicit Super Admin before relying on this |

لا توجد broad user query غير مقيدة متبقية في Lecturer/Recruiter flows الرئيسية. المشكلات المتوقعة ناتجة أساسًا من schema التاريخي لا من query shape الجديد.

## 8. Local File API Production Readiness

**النتيجة: `BLOCKED`**

| Check | Production/local configuration evidence | Result |
|---|---|---|
| `REACT_APP_FILE_API_URL` | غير مضبوط؛ frontend fallback `http://localhost:5050` | BLOCKER |
| `FILE_API_ALLOWED_ORIGINS` | غير مضبوط | BLOCKER للإنتاج |
| `FIREBASE_PROJECT_ID` backend | غير مضبوط في `.env` الحالي | BLOCKER |
| ADC/service credential | غير مهيأ في البيئة الحالية | BLOCKER لتشغيل backend خارج Emulator |
| File public base URL | غير مضبوط | NEEDS_CONFIGURATION |
| 25MB cap | server default/hard cap 25MB؛ Phase 1A PASS | READY in code |
| Firebase ID-token verification | `verifyIdToken(token, true)`؛ Phase 1A PASS | READY in code |
| MIME/extension/magic | موجود ومختبر | READY in code |
| Local `server/uploads` in current package | 0 files | لا يثبت وجود ملفات host الإنتاجي |
| Firestore local protected URL refs | 3 | physical availability unknown; manifest required |
| External document URLs | 3 | خارج Local File API authorization |
| Cloudinary URLs among detected document refs | 0 | none in documents collection scan |

## 9. Security Deployment Blockers

| Severity | Issue | Evidence / affected | Required action | Migration? | Code fix? | Deploy blocker? |
|---|---|---|---|---|---|---|
| P0 | Production Firestore public full CRUD | deployed `allow read, write: if true`؛ all collections | emergency containment/deploy plan with rollback and smoke tests | NO | Rules deployment | YES |
| P0 | Historical plaintext passwords | 9 recruiterRequests | incident handling، approved backup، delete fields only after separate approval، credential rotation assessment | YES | NO | YES |
| P1 | Break-glass not explicit | 0 explicit، 1 legacy fallback | assign explicit adminLevel/status/permissions to verified UID and test login | YES | later remove fallback | YES |
| P1 | Approved recruiter requests inconsistent | 8/8 unusable; all 9 lack authUid | reconcile request/Auth/users without using stored passwords | YES | recovery workflow may be needed | YES |
| P1 | Recruiter profiles incomplete | 4/4 missing universityId | verified university mapping/backfill | YES | NO | YES |
| P1 | Applications missing recruiter ownership | 8/8 | derive recruiterId from immutable position owner with dry-run/rollback | YES | NO | YES |
| P1 | Interviews missing relations | 9 applicationId، 9 position relation، 6 recruiterId | backfill from verified application/position relationships | YES | optional legacy display handling | YES |
| P1 | Auth orphan identities | 2 Auth users without users docs | classify staged/legacy identities; no automatic activation/deletion | YES | NO | YES |
| P1 | File API production config absent | URL/origin/project credentials absent | configure HTTPS endpoint, origins, ADC outside repo, persistent uploads | config | deployment config | YES |
| P2 | Notification schema inconsistency | 2 missing recipient، 15 mixed states | normalize recipient/readState/businessStatus with idempotent migration | YES | consumers may need compatibility | NO for Rules if accepted as inaccessible legacy |
| P2 | File reference/provider uncertainty | 3 protected local refs، 3 external، local bundle has 0 files | storage manifest/existence scan on actual host | YES/manifest | NO | YES for file-service cutover |
| P1 | Dependency security gate | prior audit: 6 critical، 60 high | separate controlled dependency remediation | NO | YES | YES for production release |

## 10. Required Work Before Deploy

بسبب القرار C، لا تُقترح أو تنفذ أوامر deploy الآن. الترتيب المطلوب:

1. Incident containment decision للقواعد العامة الحالية، مع نافذة تغيير منفصلة وموافقة صريحة.
2. أخذ local ZIP وProduction data export معتمدين قبل أي تعديل.
3. تثبيت Super Admin صريح والتحقق من Auth/users/status/permissions وbreak-glass login.
4. معالجة P0 password fields وفق خطة incident/rotation ثم migration حذف منفصلة؛ ممنوع استخدام القيم.
5. reconcile طلبات recruiter مع Auth/users، وعدم تحويل approved إلى active تلقائيًا.
6. backfill موثوق لـapplications.recruiterId وinterview relations وrecruiter universityId.
7. تصنيف Auth orphan identities وتوثيق قرار كل UID.
8. إصلاح notification recipient rows وفصل read state عن business status.
9. إعداد File API Production واختبار manifest للملفات على host الفعلي.
10. إعادة إنشاء fixtures مماثلة لشكل Production وتشغيل Emulator matrix + build/tests.
11. إعادة Phase 1B scan read-only؛ لا deploy إلا عندما يصبح break-glass ready وcounts الحرجة صفرًا أو توجد قواعد انتقالية مختبرة ومقبولة.

## Stop Confirmation

- لم تُنشر Rules.
- لم تتغير Firestore/Auth/Custom Claims/Firebase configuration.
- لم تُنفذ migration أو Phase 2.
- لم يُستخدم Git/GitHub.
