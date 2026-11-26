# Academia Smart — Baseline & Full Audit Report

**المرحلة:** PHASE 0 — BASELINE & FULL AUDIT  
**تاريخ التدقيق:** 2026-08-29  
**النطاق الفعلي:** `Academia-Smart-v14-Consolidated-Fixes/faculty-recruitment` مع مراجعة الملفات المكررة في جذر الحزمة  
**حالة هذا المستند:** تدقيق قراءة فقط؛ لم تُنفذ إصلاحات أو migrations أو تغيير Rules أو dependencies أو بيانات.

## Executive Summary

التطبيق يحتوي منتجًا وظيفيًا واسعًا بواجهات Lecturer وRecruiter وAdmin، وتوجد أجزاء فعلية من RBAC، التسلسل الأكاديمي، إدارة الوظائف والطلبات والمقابلات والمستندات والإشعارات، وتقارير الطباعة، وHybrid AI مع Local Fallback. لكن النسخة الحالية **ليست جاهزة أمنيًا أو تشغيليًا للإنتاج**.

أخطر نتيجة هي أن ملف `firestore.rules`، إذا كان هو المنشور فعليًا، يمنح أي مستخدم مسجّل قراءة وكتابة كل قاعدة البيانات عبر catch-all عام. وبالتوازي، يسمح تحديث `users/{uid}` للمستخدم بتغيير حقوله الحساسة، وتُحفظ كلمة مرور طلب مسؤول التوظيف نصًا صريحًا في Firestore. كما أن قبول طلب مسؤول التوظيف لا ينشئ حسابًا إطلاقًا؛ بل يغيّر حالة الطلب إلى `approved` فقط ويعرض نجاحًا، وهو السبب المباشر للسلوك اليدوي المبلغ عنه.

خدمة الملفات المحلية تطبق حد 25MB وفلتر MIME/extension، لكنها بلا مصادقة أو authorization أو rate limiting، وتخدم الملفات علنًا. إعدادات الخادم المذكورة في `.env.example` لا تُحمّل من `.env` في `server/index.js`، فيبقى CORS مفتوحًا افتراضيًا ويُستخدم مجلد `server/uploads`. هذا المجلد فارغ في النسخة المدققة، لذلك لا توجد ملفات فعلية يمكن مطابقتها مع مراجع Firestore القديمة.

الإشعارات والعداد لهما أساس جيد، لكن Deep Links تُخزّن ولا تُستهلك، ولوحات التحكم لا تقرأ query parameters. كما أن رفع المستند لا ينشئ إشعارًا لمسؤول التوظيف، وصفحة إشعاراته لا تعرض إلا نوعين قديمين. منع التكرار عبر `eventKey` غير ذري، وبعض المنتجين يتجاوزونه بالكامل.

لم ينجح build الحالي لأن `node_modules` غير موجود و`react-scripts` غير متاح. إضافة إلى ذلك، `package-lock.json` غير متزامن مع `package.json` ولا يقفل Multer/CORS/Concurrently؛ لذلك لا يمكن اعتماد نتيجة audit offline أو إعادة إنتاج التثبيت بثقة. لم يُنفذ `npm install` التزامًا بعدم تعديل المشروع.

## منهجية وحدود التدقيق

- قُرئ `README.md` أولًا؛ وهو README افتراضي لـCreate React App ولا يصف النظام.
- لم يكن `docs/` أو `codex-prompts/` موجودًا قبل هذا التدقيق.
- تمت مراجعة جميع ملفات النص والكود والإعدادات recursively، مع استثناء binaries الكبيرة و`node_modules/build/dist/cache`.
- لم تُعرض قيم `.env`؛ تمت مراجعة أسماء المتغيرات فقط.
- تمت مراجعة `server/uploads` بالعدد والحجم دون كشف أسماء ملفات؛ النتيجة: 0 ملف.
- لم يُستخدم Git أو GitHub، ولم تُنفذ migrations أو deploy أو تعديل Rules.
- لا يوجد وصول موثّق إلى بيانات Firestore الحية أو Firebase Console، لذا حالة نشر `firestore.rules` وسلامة البيانات الحية تحتاج تحققًا منفصلًا.
- محاولة `npm run build` توقفت فورًا بسبب فقدان `react-scripts` ولم تنشئ `build/`.

## Severity

| المستوى | المعنى |
|---|---|
| P0 Critical | اختراق شامل، كشف أسرار/بيانات أو فقد سلامة النظام، أو مسار أساسي يعطي نتيجة كاذبة خطرة. |
| P1 High | تجاوز صلاحيات مهم، فقد/فساد بيانات محتمل، أو تعطل مسار أعمال رئيسي. |
| P2 Medium | ميزة جزئية، عدم اتساق بيانات/UX مؤثر، أو مخاطرة تحتاج شروطًا إضافية. |
| P3 Low | دين تقني، توثيق، صيانة، أو تحسين تجربة منخفض الأثر. |

## Project Inventory

- 118 ملفًا خارج المجلدات المستثناة، بحجم إجمالي يقارب 20.6MB.
- 6,547 سطر JS/JSX تقريبًا.
- 31 أصل صورة/أيقونة ثنائي؛ لم تُقرأ محتوياتها لأنها غير ضرورية للتحليل.
- التطبيق الرئيسي: `faculty-recruitment/`.
- جذر الحزمة يحتوي `package.json` غير قابل للتشغيل، وثلاثة ملفات source قديمة/فارغة، وملف تشغيل batch؛ هذا هيكل legacy موازٍ.
- لا يوجد `firebase.json` أو `firestore.indexes.json` أو اختبارات وظيفية حديثة أو backend موثوق لإدارة Auth.
- `server/uploads` موجود لكنه فارغ تمامًا في النسخة الحالية.

## Module Inventory

| المجال | الوحدات الفعلية | الحالة المختصرة |
|---|---|---|
| Bootstrap/Routes | `src/App.js`, `src/index.js` | Routes محمية حسب الدور؛ الأقسام داخل dashboards ليست routes. |
| Authentication | Login/SignUp/RecruiterSignUp/Forgot/Reset/ProtectedRoute | Lecturer signup فعلي؛ recruiter signup طلب فقط؛ blocked check موجود لكنه غير فوري. |
| Lecturer | Dashboard, Profile, ViewPositions, TrackApplications, UploadDocuments, Notifications, Ratings | معظم التدفق موجود؛ deep links/statuses/verification غير متسقة. |
| Recruiter | Dashboard, Post/Manage Positions, ViewApplications, Interviews, Documents, Ratings, Notifications, Lecturers | وظائف رئيسية موجودة؛ إشعارات recruiter ناقصة وقراءات واسعة. |
| Admin | `AdminDashboard.jsx` | حسابات، requests، academic hierarchy، report، audit، health؛ provisioning recruiter مفقود. |
| RBAC | ProtectedRoute + Admin UI + Rules helpers | UI جزئي؛ Rules خطرة وغير متطابقة مع legacy admin. |
| Firebase | Auth, Firestore, Storage init, Analytics | Storage مهيأ لكنه غير مستخدم للمستندات؛ لا backend Admin SDK. |
| File Service | `server/index.js`, `utils/fileUpload.js` | Local Express upload/static، 25MB، بلا auth. |
| Notifications | Context + two notification modules + producers | schema مزدوج؛ eventKey جزئي؛ deepLink غير منفذ. |
| AI | `aiService.js`, `AcademiaSmartAI`, `SmartAssistant`, PostPosition assistant | Cloud + local fallback موجود؛ وظائف متقدمة ناقصة ومخاطر PII. |
| i18n | `LanguageContext`, `ar.json`, `en.json` | 399 مفتاحًا متطابقًا؛ نصوص كثيرة hardcoded وبيانات إنجليزية. |
| Reports | print HTML في Admin/PostPosition | PDF عبر Print فقط؛ لا CSV/Excel ولا تقارير Audit. |

## أعلى النتائج ومصفوفة الأدلة

| ID | الشدة | النتيجة | الدليل | اختبار التحقق المقترح |
|---|---|---|---|---|
| AS-SEC-001 | P0 | catch-all في Rules يسمح لأي مستخدم مسجّل بالقراءة والكتابة على كل المستندات، ويتغلب بمنطق OR على القيود السابقة. | `firestore.rules:46`, match `/{document=**}` | في Emulator فقط: سجل كمحاضر وحاول تعديل `users/{admin}`, حذف `adminLogs`, وكتابة `ratings`; يجب أن تُرفض جميعها بعد الإصلاح. |
| AS-SEC-002 | P0 | كلمة مرور مسؤول التوظيف تُحفظ plaintext داخل `recruiterRequests`. | `RecruiterSignUp.jsx:98-108`, الحقل `password` في السطر 102 | أنشئ طلبًا تجريبيًا في Emulator وتأكد أن أي مستند request لا يحتوي password/secret إطلاقًا. |
| AS-BUG-001 | P0 | قبول Recruiter request لا ينشئ Auth account أو `users`؛ يغيّر status فقط ثم يعرض نجاحًا. | `AdminDashboard.jsx:57`, `processRequest`; العرض يختفي لأن `pending` يُفلتر في `:32`. | قبول طلب جديد؛ لا تعتبر العملية ناجحة إلا إذا أمكن تسجيل الدخول ويوجد `users/{uid}` بـrole/status/universityId ثم أصبح request approved. |
| AS-SEC-003 | P0 | مالك `users/{uid}` يستطيع تحديث المستند دون تقييد الحقول، بما فيها role/adminLevel/permissions/accountStatus؛ ومع catch-all يصبح الخطر شاملًا. | `firestore.rules:10-14`, خصوصًا `allow update: request.auth.uid == uid` | Emulator: محاضر يحاول تحويل role إلى admin ومنح `*`; يجب الرفض مع السماح فقط لحقول profile المسموحة. |
| AS-SEC-004 | P1 | Local File API بلا auth/ownership/rate limit، upload وstatic read متاحان لأي طرف يصل للمنفذ. | `server/index.js:15-17,25,34-42`; لا middleware مصادقة | طلب upload بدون token وGET لملف مستخدم آخر؛ كلاهما يجب أن يفشلا بعد الإصلاح. |
| AS-SEC-005 | P1 | صلاحيات collections صريحة واسعة: notifications/documents/interviews/applications/users، إضافة إلى catch-all. | `firestore.rules:11-13,26-34` | مصفوفة Emulator لكل role/collection/CRUD/ownership، تشمل recruiter آخر ومحاضر آخر. |
| AS-DEP-001 | P1 | Multer `^1.4.5-lts.1` متأثر بثغرات DoS منشورة، ولا يوجد له lock entry أصلًا. | `package.json:17`; `package-lock.json` لا يحتوي `node_modules/multer` | بعد checkpoint: lock نظيف، تثبيت معزول، فحص advisory، واختبارات malformed/aborted multipart ضد Multer >=2.2.0. |
| AS-NOT-001 | P1 | Deep Links محفوظة في الإشعارات لكن لا يوجد مستهلك لها؛ dashboards لا تقرأ `section`/IDs. | Producers: `ViewPositions.jsx:204-211`, `ViewApplications.jsx:129-142`, `ManageInterviews.jsx:21-22`; consumers: `LecturerDashboard.jsx:17-107`, `RecruiterDashboard.jsx:20-135` | افتح روابط document/interview/application/position مباشرة وفي نافذة جديدة؛ يجب فتح القسم والسجل الهدف بعد auth. |
| AS-NOT-002 | P1 | رفع مستند لا يرسل إشعارًا للـRecruiter، وصفحة إشعارات Recruiter لا تعرض application/document/interview types. | `UploadDocuments.jsx:95-124` ينشئ document فقط؛ `RecruiterNotifications.jsx:21-25` يفلتر نوعين فقط | ارفع مستندًا؛ يجب إنشاء event واحد باسم المستند، badge، وفتح reviewer على documentId. |
| AS-DATA-001 | P1 | منع التكرار للتطبيقات والإشعارات وطلبات التقييم client-side وغير ذري؛ duplicate ممكن مع الضغط/التوازي. | `ViewPositions.jsx:136-197`; `notificationService.js:4-16`; `RequestRatings.jsx:73-99` | شغّل طلبين متزامنين لنفس business key؛ يجب أن ينتج مستند واحد باستخدام deterministic ID/transaction. |

## Confirmed Bugs

### AS-BUG-001 — قبول Recruiter request نجاح كاذب — P0

- **الواقع:** `processRequest` ينفذ `updateDoc` للحالة و`processedAt` فقط، ثم Toast نجاح.
- **الأثر:** لا Auth user، لا `users/{uid}`، لا `role=recruiter`، لا `accountStatus=active`، ولا `universityId` في حساب.
- **لماذا اختفى من Pending:** الواجهة تعرض `requests.filter(status==='pending')`، وليس لأن المستند حُذف.
- **الرفض:** يغير الحالة إلى `rejected` ولا ينشئ حسابًا، وهو مطابق للسلوك المطلوب.
- **الدليل:** `AdminDashboard.jsx:32,57,102`.
- **التحقق:** اختبار تكاملي provisioning كامل مع rollback/compensation عند فشل أي خطوة، وعدم عرض نجاح إلا بعد read-back.

### AS-BUG-002 — Draft jobs ظاهرة للمحاضر — P1

- **الواقع:** فلتر الوظائف يستبعد `paused/closed/archived` ولا يستبعد `draft`.
- **الدليل:** `ViewPositions.jsx:91-96,228-235`.
- **التحقق:** أنشئ draft وتأكد أنها لا تظهر ولا يمكن التقديم عليها حتى لو عُرف ID.

### AS-BUG-003 — Recruiter notifications تخفي غالبية الإشعارات — P1

- **الواقع:** Context يحسب كل الإشعارات للمستخدم، بينما الصفحة تستعلم فقط عن `rating_request` و`university_verification`.
- **الأثر:** badge قد يكون أكبر من القائمة، وإشعارات application/document غير مرئية.
- **الدليل:** `NotificationContext.js:44-52`; `RecruiterNotifications.jsx:21-25`.
- **التحقق:** أنشئ كل notification type وتأكد من ظهورها وترتيبها وربطها.

### AS-BUG-004 — نوع verification المنتج لا يطابق النوع المستهلك — P1

- **الواقع:** Profile ينشئ `course_verification`، والصفحة تستعلم/تعالج `university_verification`.
- **الدليل:** `Profile.jsx:261-300`; `RecruiterNotifications.jsx:24,78`.
- **التحقق:** تعديل teaching experience يجب أن ينتج طلبًا واحدًا ظاهرًا ويمكن قبوله مع تحديث العنصر الصحيح.

### AS-BUG-005 — طلبات verification تتكرر ولا يُحفظ verificationId — P1

- **الواقع:** `sendUniversityVerificationRequest` ينشئ verification ويعيد لا شيء؛ save يكرر الإنشاء عندما يبقى `verificationId` فارغًا.
- **الدليل:** `Profile.jsx:242-305,392-412`.
- **التحقق:** احفظ profile مرتين بلا تغيير؛ يجب ألا يزيد عدد الطلبات.

### AS-BUG-006 — Mark all read قد يمحو business status — P1

- **الواقع:** notification `status` مستخدم لـapproved/rejected/pending، لكن `markNotificationsRead` يكتبه `read`.
- **الدليل:** `notificationService.js:19-24`; `ReviewDocuments.jsx:49-58`; `LecturerNotifications.jsx:195-207`.
- **التحقق:** إشعار document_review approved ثم Mark all; يجب أن يبقى reviewStatus approved ويُغير readState فقط.

### AS-BUG-007 — `type` و`employmentType` حقلان متنافسان للوظيفة — P2

- **الواقع:** PostPosition ينشئ/يعرض `type`; ManagePositions يعدّل `employmentType` فقط.
- **الدليل:** `PostPosition.jsx:12-27,120,280`; `ManagePositions.jsx:16,19`.
- **التحقق:** عدّل نوع الوظيفة ثم راجع البطاقة والجدول والتقرير ومستند Firestore؛ يجب وجود canonical field واحد.

### AS-BUG-008 — statuses الموسعة لا تظهر جيدًا في TrackApplications — P2

- **الواقع:** Recruiter يستخدم 6 حالات، بينما Lecturer filters/labels تدعم pending/accepted/approved/rejected فقط.
- **الدليل:** `ViewApplications.jsx:90-97`; `TrackApplications.jsx:52-77,102-104`.
- **التحقق:** مرّر الطلب بكل الحالات وتأكد من label/color/filter/timeline بالعربية والإنجليزية.

### AS-BUG-009 — المقابلات القديمة لا تُhydrate من application/job — P2

- **الواقع:** القائمة تعرض `i.positionTitle || 'وظيفة غير محددة'` ولا تعيد الربط بالسجلات المحملة.
- **الدليل:** `ManageInterviews.jsx:16,27`.
- **التحقق:** سجل legacy بلا positionTitle لكن مع applicationId/positionId؛ يجب عرض اسم الوظيفة أو friendly orphan state.

### AS-BUG-010 — تسجيل محاضر قد يترك Auth orphan — P1

- **الواقع:** Auth user يُنشأ قبل `setDoc(users)` ولا توجد compensation إذا فشل Firestore. Login عند فقد profile لا ينفذ signOut.
- **الدليل:** `SignUp.jsx:85-100`; `Login.jsx:25-48`.
- **التحقق:** اجعل users write يفشل؛ يجب حذف/تعطيل Auth المؤقت أو إكمال profile ذريًا، وتسجيل خروج الجلسة المفقودة.

## Suspected Bugs / تحتاج تحقق حي

- حالة نشر `firestore.rules` غير معروفة؛ الخطر P0 مشروط بكونه منشورًا، ويجب مقارنته Ruleset المنشور من Console دون تغييره.
- Firestore queries متعددة الحقول قد تحتاج indexes ولا يوجد `firestore.indexes.json`; بعض الأخطاء تتحول إلى شاشة فارغة أو console فقط.
- روابط local legacy قد تشير إلى `FILE_UPLOAD_DIR` خارجي غير موجود في الحزمة؛ `.env` الحالي لا يعرّفه والخادم لا يحمّل `.env` أصلًا.
- `ReviewDocuments` يعيد تركيب الرابط من `storagePath`؛ يلزم اختبار المسارات ذات الشرطات/المسافات والملفات القديمة.
- React StrictMode قد يضاعف بعض effects أثناء التطوير؛ event producers داخل actions لا تتأثر عادة، لكن subscriptions والتحميل يجب smoke-test.
- إنشاء Admin بالـsecondary app قد ينشئ Auth orphan إذا فشل `users` write؛ Rules الحالية الخطرة تخفي المشكلة المحتملة.

## Missing Features

- Backend موثوق لـRecruiter/Admin account provisioning وrollback.
- Deep-link router موحد مع IDs وحالة fallback.
- إشعار تلقائي لمسؤول التوظيف عند رفع مستند.
- Document versioning/re-upload/request flow وربط applicationId.
- AI review-note assistant: Suggest Note / Rewrite / Shorten / Formalize.
- Candidate ranking/compare، missing-skills structured output، interview scorecard/summary.
- CSV وExcel؛ PDF الحالي هو browser print فقط.
- Audit filters المنفصلة (action/admin/date)، target name resolver، email، PDF/print.
- Saved jobs، soft delete/recycle bin، migration UI، backup/system recovery.
- اختبارات فعلية RBAC/Rules/flows؛ `App.test.js` ما زال اختبار CRA افتراضيًا.

## Partially Implemented Features

- **Recruiter jobs table:** موجود أسفل صفحة **Post Position** وليس داخل **Manage Published Jobs**؛ search + status + PDF/print فقط. لا filters الأكاديمية/نوع/موعد ولا CSV/Excel، ويستخدم counter denormalized.
- **Academic report:** hierarchy/table/status/time/issuer name موجود؛ email/page numbers غير موجودة، ورسالة no subjects عامة، ولا manager identity snapshot.
- **Audit Log:** ترجمة بعض actions + اسم مشتق + search + client pagination موجود؛ IDs، permission keys، email، structured filters، PDF/print ناقصة.
- **RBAC:** tab hiding وpermissions موجودة؛ لا route لكل tab، legacy admin غير متوافق مع Rules، وdata layer خطرة.
- **Interviews:** schedule/reschedule/status/location/link/conflict موجودة؛ eligibility أوسع من approved، conflict client-only، legacy relation ناقصة، لا scorecard.
- **Hybrid AI:** candidate analysis/job description/assistant fallback موجود؛ scoring مبسط، لا ranking/compare، ولا document-note AI.
- **i18n:** ملفات الترجمة متطابقة keys، لكن مساحات واسعة hardcoded بالعربية أو الإنجليزية وبيانات domain ليست bilingual.

## Security Risks

- راجع التفاصيل الكاملة في `SECURITY-AUDIT.md`.
- P0: Firestore catch-all شامل، self role escalation، plaintext recruiter password.
- P1: File API بلا auth، كشف كل users/documents/interviews، client-side Admin account creation، blocked state غير لحظي.
- `.env` فعلي موجود ويحتوي أسماء متغيرات Cloudinary/Firebase؛ لم تُعرض القيم. وجود `CLOUDINARY_URL` قد يعني credential خادمي ويستلزم rotation review.
- Cloudinary identifiers/API key/preset hardcoded في `SignUp`, `RecruiterSignUp`, و`config/cloudinary.js`; unsigned upload قابل للإساءة.
- AI cloud يُرسل application object كاملًا وقد يحتوي PII وروابط مستندات دون data minimization.

## Data Integrity Risks

- لا transactions/batches لمسارات application + notification + counter، أو review + notification، أو account + profile.
- uniqueness في الواجهة فقط للهيكل الأكاديمي، applications، rating requests، eventKey.
- denormalized names/IDs/counters قد تصبح stale: academic names في positions/applications، user names/emails في notifications/documents/ratings/interviews.
- `phoneNumber` مقابل `phone`، `type` مقابل `employmentType`، `accepted` مقابل `approved`، و`course_verification` مقابل `university_verification`.
- `new Date().toISOString()` وFirestore Timestamp مختلطان في الحقول الزمنية.
- safe delete يفحص علاقات مباشرة محدودة فقط، وليس التاريخ الكامل.
- admin audit يُنفذ بعد الفعل وقد يفشل بصمت؛ لا atomic integrity ولا immutable trusted writer.

## Legacy / Duplicate / Dead Code

- جذر الحزمة يضم مشروعًا هيكليًا قديمًا: `package.json` بلا start، Login قديم، وملفان فارغان.
- `src/firebase/notifications.js` غير مستورد؛ يوجد بديله Context + notificationService.
- `src/config/cloudinary.js` غير مستورد، بينما القيم مكررة hardcoded في صفحتي signup.
- Firebase Storage مهيأ ويُطبع في console لكنه غير مستخدم لتخزين المستندات.
- `App.css`, `logo.svg`, وCRA test/manifest/README بقايا template.
- `ViewRecruiters.jsx` route مرئي لكنه placeholder إنجليزي بلا بيانات.
- `handleTeachingDepartmentChange` و`subjectCode` state غير مستخدمين.
- `PostPosition` و`ManagePositions` يقدمان تجربتي إدارة متداخلتين وغير متطابقتين.

## UX / i18n Issues

- 399 leaf key في كل من ar/en بلا key gaps، لكن كثيرًا من الشاشات الحديثة hardcoded `dir="rtl"` ولا تتبدل فعليًا للإنجليزية.
- قيم Firestore مثل `Full-time`, `Contract`, document types، academic names، statuses قد تظهر raw؛ يجب فصل canonical enum عن localized label.
- `ViewApplications` يحتوي fallbacks إنجليزية مباشرة (`Not Specified`, `Unknown Position`, `No Email`).
- `ViewRecruiters` بالكامل إنجليزي.
- native validation الإنجليزية تظهر بسبب `required/type=email/type=url/min/max` في Login/Signup/RecruiterSignup/PostPosition/ManageInterviews/Profile/ratings/notifications.
- Lecturer notifications تُعلّم الإشعار مقروءًا أثناء render، لا عند click/explicit open.
- أخطاء كثيرة تُسجل في console فقط بلا Error state/retry، خصوصًا review/applications/profile lookups.

## File Storage Risks

- الهدف 25MB مطبق في الواجهة والخادم.
- MIME + extension check موجود، لكن يعتمد `file.mimetype` الذي يرسله العميل ولا يفحص magic bytes.
- لا auth/authorization، quotas، rate limiting، antivirus، retention، backup، signed URLs، أو ownership check.
- CORS يسمح لكل origins إذا لم تُحدد القائمة، ويسمح أي `http://localhost:<port>`؛ وNode لا يحمّل `.env`.
- health endpoint يكشف absolute `uploadsRoot`.
- `server/uploads` فارغ في الحزمة؛ مراجع Firestore لا يمكن التحقق منها محليًا، وخطر ENOENT/orphan مؤكد تصميميًا.
- لا friendly JSON/HTML error مترجم عند فتح ملف مفقود، ولا migration manifest/checksum.

## Notification Risks

- schema مزدوج `receiver.id` و`userId` مع حقول legacy `receiverId/senderId`.
- `eventKey` query-then-add غير ذري، وليس unique؛ كثير من producers يستخدم `addDoc` مباشرة.
- `status` يجمع read state وbusiness state.
- Deep Links لا تُنفذ.
- recruiter page لا تعرض معظم الأنواع.
- document upload لا ينشئ notification.
- document review يذكر اسم المستند فعليًا، لكن بلا eventKey/deepLink.

## RBAC Risks

- UI hiding ليس enforcement كافيًا.
- legacy admin يُعامل Super Admin في UI (`ProtectedRoute`/AdminDashboard) لكن Rules لا تمنحه هذا التوافق.
- `jobs.view` permission موجودة بلا Admin jobs tab فعلي.
- Admin route يحمي الدور فقط؛ permissions داخل component tabs.
- Super Admin protection تعتمد mutable fields داخل `users` بدل custom claims/backend.
- Firestore catch-all يلغي فعليًا كل RBAC إذا كان منشورًا.

## AI Risks

- Local match score يبدأ من 30 وقد يرتفع بسبب استخدام `app.department` داخل target وcandidate معًا؛ هذا قد يضخم التطابق.
- لا model/version/prompt logging أو explainable feature weights أو calibration tests.
- Cloud response validation جزئية؛ غياب strengths/gaps قد يكسر UI.
- application object كامل يُرسل للendpoint؛ يحتاج data minimization/consent/DPA.
- Local fallback موجود ومثبت بالكود للمرشح والوصف والمساعد.
- المساعد role-aware وpathname-aware فقط؛ لا يعرف البطاقة الداخلية الحالية لأن dashboard state لا ينعكس في URL.
- يوجد disclaimer وأن القرار بشري؛ لا يوجد auto-accept/reject في AI code.

## Dependency Risks

- راجع `DEPENDENCY-AUDIT.md`.
- `package-lock.json` لا يعكس خمس إضافات مباشرة؛ التثبيت غير reproducible.
- Multer 1.x متأثر بعدة DoS advisories؛ الترقية الكبرى تحتاج compatibility test.
- Create React App/react-scripts في long-term stasis/deprecated، ومعه 21 transitive package عليها deprecation metadata.
- online audit لم يكتمل بسبب الشبكة؛ offline audit أظهر صفرًا من cache لكنه غير موثوق بسبب lock القديم وغياب Multer.

## Build / Test Baseline

| الفحص | النتيجة |
|---|---|
| `node --check server/index.js` | PASS |
| `npm run build` | FAIL: `react-scripts` غير موجود لأن `node_modules` غير موجود |
| unit tests | لم تُشغل؛ نفس dependency blocker، والاختبار الوحيد `App.test.js:4-7` يتوقع “learn react” غير الموجودة |
| npm audit online | لم يكتمل بسبب الشبكة؛ أُوقف دون تعديل |
| npm audit offline | 0 findings للـlock القديم فقط؛ غير صالح لإثبات الأمان |
| source/config mutation | لا يوجد؛ الملفات الجديدة الوحيدة هي تقارير `docs/audit/` |

## الخلاصة

لا تبدأ Phase 1 قبل اعتماد خطة الإصلاح. الأولوية المنطقية هي: تثبيت baseline/backup بعد الموافقة، معالجة secrets وRules وplaintext password/provisioning، ثم auth/file API، ثم integrity/idempotency/deep links، وبعدها UX/AI/reporting/dependencies. لا يجوز نشر Rules الحالية أو تسمية النسخة PASS.
