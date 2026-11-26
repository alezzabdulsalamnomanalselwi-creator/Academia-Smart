# Firestore Rules Design — Phase 1

**الحالة:** تصميم منفّذ محليًا في `firestore.rules` ولم يُنشر إلى Firebase.  
**مبدأ النشر:** لا deploy قبل نجاح Firebase Emulator Rules tests واختبار حساب Super Admin احتياطي.

## أهداف التصميم

- deny-by-default وإزالة أي catch-all يسمح للمستخدم المسجّل بكل البيانات.
- قراءة حالة المستخدم ودوره وصلاحياته من `users/{uid}` مع رفض `blocked` و`suspended`.
- منع تعديل `role`, `permissions`, `adminLevel`, `isSuperAdmin`, `accountStatus` من العميل.
- ربط البيانات الحساسة بالمالك أو مسؤول التوظيف المرتبط فعليًا.
- الإبقاء على دعم مؤقت للمدير القديم الذي لا يملك `adminLevel` أو `permissions`، إلى أن تُنفذ migration معتمدة.

## Trust Boundaries

1. Firebase Authentication يثبت UID فقط.
2. Firestore Rules تتحقق من profile وحالة الحساب والدور في كل طلب.
3. العمليات ذات الامتيازات لا تُكتب من React؛ ينفذها Express/Firebase Admin SDK بعد فحص ID token وحالة الحساب والصلاحية.
4. Admin SDK يتجاوز Rules، لذلك endpoints الخادمية تتحقق من target والدور وتكتب Audit Log موثوقًا.

## Role and Permission Helpers

- `active()`: يوجد profile والحالة ليست blocked/suspended؛ غياب `accountStatus` القديم يعامل كحساب نشط للتوافق التاريخي.
- `role(expected)`: حساب نشط ودوره مطابق.
- `superAdmin()`: `adminLevel=super` أو `isSuperAdmin=true` أو legacy admin بلا حقول المستوى/الصلاحيات.
- `hasPerm(permission)`: Super Admin أو Limited Admin يحمل المفتاح أو `*`.

دعم legacy مؤقت وخطره موثق في `DATA-CLEANUP-DRY-RUN.md`. لا يجوز إنشاء legacy admin جديد.

## Collection Matrix

| Collection | Lecturer | Recruiter | Admin | Writes الحساسة |
|---|---|---|---|---|
| users | نفسه، وملفات recruiters عبر query مقيد | نفسه، وملفات lecturers عبر query مقيد | `users.manage` أو `audit.view` للقراءة | profile allowlist فقط؛ security fields عبر backend |
| universities | النشط علنًا، والباقي للحساب النشط | قراءة | إدارة عبر `academic.manage` | CRUD حسب permission |
| colleges/departments/subjects | قراءة للحساب النشط | قراءة للحساب النشط | إدارة عبر `academic.manage` | CRUD حسب permission |
| positions | `status=open` فقط | المفتوحة أو التي يملكها | `jobs.view` أو `academic.manage` | recruiter owner فقط |
| applications | طلباته فقط | `recruiterId` أو مالك position | `jobs.view` | IDs/ownership immutable |
| documents | `userId` نفسه | `recruiterId` نفسه | `users.manage` | lecturer pending fields؛ recruiter review fields فقط |
| interviews | `candidateId` نفسه | `recruiterId` نفسه | `jobs.view` | recruiter owner وrelations immutable |
| ratings | `lecturerId` نفسه | `recruiterId` نفسه | `jobs.view` | recruiter يكتب باسمه فقط؛ no update/delete |
| notifications | receiver أو sender فقط | receiver أو sender فقط | نفس قاعدة ownership | sender identity يجب أن يطابق Auth؛ receiver يحدّث read/action fields فقط |
| verifications | lecturerId نفسه | recruiterId نفسه | `users.manage` | create للمحاضر؛ decision عبر backend فقط |
| recruiterRequests | لا وصول مباشر | لا وصول مباشر | read عبر `requests.manage` | create/approve/reject عبر backend فقط |
| adminLogs | لا | لا | read عبر `audit.view` | client admin append فقط؛ العمليات الحرجة backend trusted |
| أي Collection أخرى | deny | deny | deny | deny |

## Protected User Fields

العميل يستطيع تغيير allowlist profile فقط: الاسم، الهاتف، الصورة، التعليم، IDs الأكاديمية، روابط الملفات، المهارات، سنوات الخبرة، و`updatedAt`. `teachingExperience` مستبعد من الكتابة المباشرة لأن داخله `verified`, `verifiedBy`, `verificationStatus`; حفظه يتم في `/api/profile` مع الحفاظ على الحقول الموثوقة وإسقاط أي محاولة لتزويرها.

## Query Contracts Required by Rules

- Lecturer positions: `where('status','==','open')`.
- Recruiter applications: أولًا positions المملوكة، ثم applications مقيدة بـ`positionId`.
- Recruiter interviews/documents: `where('recruiterId','==',uid)`.
- Users directory: query مقيد بـ`role`.
- Notifications: query مقيد بـ`receiver.id`, `userId`, أو sender عند الحاجة.
- Ratings: الطرف الحالي موجود في query.

قد تتطلب بعض الاستعلامات composite indexes. لا يوجد `firestore.indexes.json` حاليًا؛ أي رسالة index من Emulator يجب توثيقها قبل إضافة index أو نشره.

## Idempotency

الإشعارات التي تستخدم `createNotificationOnce` تحصل على document ID مشتق من SHA-256 لـ`eventKey`. Rules تسمح create ولا تسمح للsender بإعادة كتابة المستند؛ محاولة متزامنة ثانية تصبح duplicate آمنًا. Account provisioning يستخدم claim transaction و`processingAttemptId` وAudit ID ثابت للطلب.

## Required Emulator Tests Before Deployment

1. Lecturer/Recruiter يحاول تعديل role/permissions/adminLevel/accountStatus لنفسه: DENY.
2. Limited Admin يحاول تعديل/حظر/إيقاف Super Admin: DENY.
3. blocked/suspended user يحاول read/write كل collection: DENY.
4. Lecturer A يقرأ application/document/notification للمحاضر B: DENY.
5. Recruiter A يقرأ أو يعدل application/document/interview/rating للـRecruiter B: DENY.
6. Lecturer يقرأ draft position أو يعدّل counter: DENY.
7. owner flows الجديدة لكل collection: ALLOW.
8. legacy application بلا `recruiterId` مع position owner الصحيح: ALLOW للمالك فقط.
9. unknown collection read/write: DENY.
10. legacy Super Admin ثم Limited Admin fixtures للتحقق من عدم lockout.

## Deployment Gate

- تشغيل الاختبارات السابقة في Emulator.
- مقارنة ruleset المنشور read-only.
- إنشاء/تأكيد حساب break-glass Super Admin.
- نشر Rules في نافذة مراقبة منفصلة وبموافقة صريحة.
- smoke test لكل role ثم الاحتفاظ بإمكانية rollback إلى ruleset موثوق، لا إلى catch-all غير الآمن.
