# Phase 1 Implementation — Critical Data & Auth Integrity

**التاريخ:** 2026-08-30  
**الحالة:** WIP مكتمل برمجيًا، لكن التكامل مع Firebase Emulator/credentials وRules deployment غير منفذ.

## Scope المنفذ

### Firestore / RBAC

- استبدال catch-all المفتوح بـdeny-by-default.
- field allowlist لملفات المستخدمين، ومنع self role/permission/status escalation.
- حماية Super Admin في Rules والـbackend، ومنع Limited Admin من استهداف مدير رئيسي أو مدير آخر.
- ownership على applications, documents, interviews, ratings, notifications, verifications.
- تعديل استعلامات React التي كانت تحمل collections كاملة لتتوافق مع ownership.
- تحديث `ProtectedRoute` وAdmin session لحظيًا عبر `onSnapshot`; الحساب المحظور/الموقوف يفقد الوصول إلى Firestore والـFile API وتُلغى refresh tokens عند التغيير الخادمي.

### Recruiter Signup and Provisioning

- React لم يعد يكتب `recruiterRequests` مباشرة.
- `/api/recruiter-requests` يتحقق من الجامعة النشطة، ينشئ Auth user معطّلًا، ثم request بلا password.
- فشل Firestore بعد إنشاء Auth يفعّل compensation بحذف Auth user المؤقت.
- approval: transaction claim → تحقق email/role → enable Auth → transaction users/request/audit.
- النجاح لا يرجع إلا بعد وجود `users/{uid}` بـ`role=recruiter`, `accountStatus=active`, `universityId` الصحيح.
- تكرار approve يتحقق من الحالة الموجودة ولا ينشئ حسابًا أو Audit duplicate.
- الفشل يعيد request إلى pending ويحاول تعطيل Auth user؛ لا success toast كاذب.
- rejection يحدث request ويزيل staged disabled Auth user إن أمكن، ولا ينشئ users recruiter document.
- الطلبات التاريخية بلا `authUid` لا تستخدم password القديم؛ ترجع `LEGACY_REQUEST_REQUIRES_RECOVERY` وتبقى pending.

### Privileged User Operations

- إنشاء Limited Admin انتقل من secondary Firebase client app إلى backend.
- role/permissions/adminLevel/accountStatus انتقلت إلى endpoint محمي.
- تغيير الحالة يعطّل/يفعّل Auth، يحدّث Firestore، يلغي refresh tokens، ويكتب Audit Log.
- profile teaching experience انتقل إلى backend حتى لا يستطيع lecturer تزوير verification state.
- verification decision يتحقق من recruiterId وlecturer/experience relation داخل transaction.

### Local File API

- Firebase ID token مطلوب للرفع والقراءة.
- user folder مشتق من token وليس من body.
- 25MB hard cap، file/field/parts limits، MIME + extension + magic-byte signature.
- random filename، basename sanitation، path traversal containment.
- protected `/uploads/*` و`/api/files/*`; owner/Admin أو recruiter المرتبط فقط.
- CORS allowlist؛ localhost مسموح في development فقط، ولا wildcard fallback في production.
- health لا يكشف absolute path.
- missing file يرجع `{ok:false,code:'FILE_NOT_FOUND',message:'الملف غير متوفر أو تم نقله.'}`.
- الواجهة تفتح الملفات المحلية عبر Bearer token وتعرض JSON error الودي.

### Notifications / Idempotency

- `markNotificationsRead` يغير `read/readAt` فقط ولا يمس business `status`.
- `createNotificationOnce` يستخدم deterministic SHA-256 document ID وcreate-only Rules.

### Dependencies

- أضيف `firebase-admin@14.3.0` لأن account/token privileged operations لا يجوز تنفيذها في React.
- رُقّي `multer` من 1.4.5-lts.1 إلى 2.3.0.
- تحديثات مستهدفة ضمن نفس major: `express@4.22.2`, `firebase@11.10.0`, `react-router-dom@7.18.3`.
- لم يُستخدم `npm audit fix` أو `--force`.

## Environment Required

- `GOOGLE_APPLICATION_CREDENTIALS`: مسار JSON محلي خارج repository، أو Application Default Credentials في بيئة الاستضافة.
- `FIREBASE_PROJECT_ID`.
- `FILE_API_ALLOWED_ORIGINS` إلزامي للإنتاج.
- Emulator بديل آمن: `FIRESTORE_EMULATOR_HOST` و`FIREBASE_AUTH_EMULATOR_HOST`.
- يجب استخدام HTTPS في الإنتاج؛ password يمر transient إلى backend ولا يُخزن.

## Files Changed

- Security/backend: `firestore.rules`, `server/index.js`, `server/firebaseAdmin.js`, `server/security.js`, `server/security.test.js`.
- API/config: `.env.example`, `package.json`, `package-lock.json`, `src/services/apiClient.js`, `src/utils/fileUpload.js`.
- Auth/RBAC UI: `RecruiterSignUp.jsx`, `Login.jsx`, `ProtectedRoute.jsx`, `AdminDashboard.jsx`.
- Ownership/data UI: `ViewPositions.jsx`, `ViewApplications.jsx`, `ManagePositions.jsx`, `ManageInterviews.jsx`, `ReviewDocuments.jsx`, `ViewLecturers.jsx`, `Profile.jsx`, `RecruiterNotifications.jsx`, `DocumentUploader.jsx`.
- Notifications/tests: `notificationService.js`, `App.test.js`, `setupTests.js`.
- Generated: `node_modules/`, `build/` نتيجة install/build؛ مستبعدان من ZIP checkpoints.

## Not Implemented in Phase 1

- لا Firebase Rules deploy ولا data migration ولا cleanup حي.
- لا redesign شامل للإشعارات أو deep links أو document-upload notification.
- لا migration للملفات القديمة.
- لا CRA/toolchain major migration رغم audit risks؛ يحتاج Phase مستقلة واختبارات أوسع.
