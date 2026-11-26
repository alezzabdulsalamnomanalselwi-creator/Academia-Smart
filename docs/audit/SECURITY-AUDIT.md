# Academia Smart — Security Audit

**الحالة:** Static audit فقط. لم تُنشر Rules ولم تُغيّر إعدادات Firebase أو secrets.  
**مهم:** وجود `firestore.rules` في المشروع لا يثبت أنه ruleset المنشور؛ يجب التحقق read-only من Firebase Console/CLI في Phase مصرح بها.

## Security Posture Summary

إذا كانت Rules المحلية منشورة، فقاعدة البيانات معرضة لتجاوز صلاحيات شامل بواسطة أي حساب Firebase مسجّل. توجد أيضًا كلمة مرور recruiter plaintext، وFile API بلا مصادقة، وaccount provisioning من browser، وقراءات واسعة للبيانات الشخصية. التصنيف العام: **P0 / غير صالح للإنتاج قبل الإصلاح والتحقق**.

## 1. Authentication

### الموجود

- Firebase Email/Password Auth.
- Login يفحص `users.role` و`accountStatus`.
- ProtectedRoute ينتظر `onAuthStateChanged` ويقرأ users doc.
- Forgot/Reset Password يستخدم Firebase APIs.
- signup للمحاضر ينشئ Auth ثم users doc.

### النتائج

| ID | الشدة | النتيجة | الدليل | Validation test |
|---|---|---|---|---|
| SEC-AUTH-01 | P0 | Recruiter password محفوظ plaintext في Firestore request. | `RecruiterSignUp.jsx:98-108` | افحص request جديد؛ يجب ألا يحتوي password/hash/secret. |
| SEC-AUTH-02 | P0 | قبول recruiter لا ينشئ حسابًا لكنه يعرض نجاحًا. | `AdminDashboard.jsx:57` | provisioning end-to-end + read-back + login. |
| SEC-AUTH-03 | P1 | Auth/profile creation غير ذري؛ يمكن Auth orphan. | `SignUp.jsx:85-100`, `AdminDashboard.jsx:71-77` | اجعل Firestore write يفشل وتأكد من compensation. |
| SEC-AUTH-04 | P1 | Login عند profile مفقود لا ينفذ signOut. | `Login.jsx:43-48` | Auth user بلا users doc يجب أن تنتهي جلسته وتُمنع كل البيانات. |
| SEC-AUTH-05 | P1 | blocked/suspended ليس enforcement فوريًا في UI؛ ProtectedRoute يستمع Auth فقط لا users snapshot. | `ProtectedRoute.jsx:12-33` | احظر جلسة مفتوحة؛ يجب إغلاقها/رفضها فورًا. |
| SEC-AUTH-06 | P2 | Reset email action URL في ForgotPassword هو `/login` بينما custom `/reset-password` يعتمد Console template. | `ForgotPassword.jsx:9`, `ResetPassword.jsx:6` | اختبر البريد المنشور وoobCode على domain الفعلي. |

## 2. RBAC and Super Admin

- UI يحسب legacy admin كSuper عند غياب `adminLevel` و`permissions` (`ProtectedRoute.jsx:22-25`, `AdminDashboard.jsx:42-46`).
- Firestore `superAdmin()` لا يحتوي legacy fallback (`firestore.rules:7-8`).
- النتيجة: UI قد يعرض كل شيء لlegacy admin بينما Rules المقيدة ترفضه؛ catch-all الحالي يخفي هذا الاختلاف بمنح الجميع access.
- Super Admin identity داخل mutable user document، لا custom claim أو trusted backend.
- `users.manage` يسمح بتحديث أي users doc في rule الصريحة، بلا حماية immutable لـSuper Admin.
- Admin actions ليست جميعها guarded داخل functions؛ تعتمد إخفاء tab وRules.

### مصفوفة enforcement الحالية المتوقعة من الملف

| Collection | Rule الصريحة | المشكلة |
|---|---|---|
| users | signed-in read؛ self أو users.manage update | self fields غير مقيدة، كل profiles مكشوفة |
| academic | public university read؛ signed-in child read؛ academic.manage write | catch-all يجعل write للجميع |
| positions | signed-in read؛ recruiter create؛ owner update | draft/private fields مكشوفة؛ create payload غير مقيد |
| applications | owner lecturer create؛ all recruiter/admin read؛ recruiter أو owner update | recruiter ليس مقيدًا بوظائفه؛ lecturer يمكنه status update |
| interviews | signed-in read؛ any recruiter create/update | recruiter يمكنه تعديل مقابلة Recruiter آخر |
| documents | signed-in read؛ any lecturer create؛ any lecturer/recruiter update | لا ownership/receiver scope |
| notifications | signed-in read/update/create | أي user يقرأ/يعدل/يزور إشعار أي user |
| recruiterRequests | public create؛ requests.manage read/update | payload يسمح fields إضافية ومنها password؛ spam |
| adminLogs | admin create؛ audit.view read؛ no update/delete | client can forge؛ catch-all يسمح update/delete |
| ratings/verifications/unknown | catch-all only | any signed-in full CRUD |

## 3. Firestore Rules — Critical Findings

### SEC-RULE-01 — Recursive catch-all شامل — P0

```text
match /{document=**} { allow read, write: if signedIn(); }
```

في Firestore، overlapping match allow expressions تُجمع بمنطق OR؛ لذلك هذا السطر يسمح لأي signed-in user بكل read/write على كل document، بما فيها collections ذات deny صريح. هذا يشمل delete وتزوير audit وتغيير roles والبيانات التاريخية.

### SEC-RULE-02 — self-update privilege escalation — P0

`allow update: if request.auth.uid == uid || hasPerm('users.manage')` لا يقارن affected keys ولا يمنع role/admin fields.

### SEC-RULE-03 — ownership مفقودة — P1

- recruiter يقرأ/يحدث applications عامة.
- recruiter يحدث أي interview.
- lecturer/recruiter يحدث أي document.
- كل signed-in user يتعامل مع أي notification.

### SEC-RULE-04 — payload validation مفقودة — P1

لا تحقق من enum/type/required fields/timestamps/immutable ownership/size داخل Firestore entities. Client يمكنه كتابة status/counters/snapshots تعسفية.

### SEC-RULE-05 — audit integrity غير موثوقة — P1

Logs تنشأ من browser بعد الفعل وفي `try/catch` صامت (`AdminDashboard.jsx:55-57`). لا trusted server timestamp actor claim، ولا transaction مع business action.

## 4. Direct Access and Data Exposure

- `users` readable لكل signed-in: emails، phones، CV/certificate URLs، experience.
- `documents`, `interviews`, `applications` ذات read scopes واسعة.
- ReviewDocuments وManageInterviews وViewApplications تحمّل collections كاملة ثم تفلتر في client، ما يفرض Rules واسعة ويزيد التسريب.
- external CV/certificate URLs تُفتح مباشرة؛ لا proxy/access control.
- local files تُخدم static بلا token.

## 5. Local File API

| الضابط | الحالي | النتيجة |
|---|---|---|
| Authentication | لا يوجد | P1: upload/read مجهول |
| Authorization | userId من body ويُsanitize فقط | spoofing/اختيار مجلد أي UID |
| File size | 25MB server + client | موجود |
| Count | ملف واحد | موجود، لكن fields/parts limits ناقصة |
| MIME | client-provided MIME + extension map | partial؛ لا magic-byte sniff |
| CORS | allow all عند config empty + localhost regex | permissive؛ ليس security boundary لغير المتصفح |
| Rate limit/quota | لا يوجد | disk/CPU DoS |
| Malware scan | لا يوجد | ZIP/document risk downstream |
| Static access | `/uploads` public | URLs غير موقعة ولا ownership |
| Missing file UX | Express fallthrough false raw error | لا friendly app error |
| Health | public ويعيد absolute uploadsRoot | information disclosure |
| Filename | random + original extension | جيد نسبيًا |
| Path segments | alnum/_/- + max64 | جيد ضد traversal المباشر |

`FILE_API_ALLOWED_ORIGINS`, `FILE_UPLOAD_DIR`, إلخ مذكورة في `.env.example`، لكن Node لا يحمّل `.env`; ما لم تُضبط كـOS environment تبقى defaults.

## 6. CORS

- `!configuredOrigins.length` يسمح أي origin.
- regex يسمح أي port على `http://localhost`.
- لا HTTPS origin افتراضي موثق.
- حتى CORS مقيد لا يمنع curl/native clients؛ يجب auth على endpoint.
- error من CORS يدخل generic 400 handler، بلا structured policy logging.

## 7. Secrets and Environment

- `.env` موجود محليًا ومُدرج في `.gitignore`; لم تُقرأ/تُعرض قيمه.
- أسماء المتغيرات تشمل `CLOUDINARY_URL`; هذا النمط قد يتضمن API secret خادمي. يجب التحقق والrotation إذا شاركت الحزمة.
- Firebase Web config في `REACT_APP_*` public by design، والحماية يجب أن تكون Rules/App Check وليس إخفاء key.
- Cloudinary cloud name/API key/preset hardcoded في `SignUp.jsx:60-68`, `RecruiterSignUp.jsx:73-80`, `config/cloudinary.js:1-5`.
- unsigned preset يمكن إساءة استخدام quota/transformation إذا policy غير مقيدة.
- لا service-account key ظاهر في الملفات المقروءة.
- لا secret يجب وضعه في `REACT_APP_AI_API_URL` أو frontend bundle.

## 8. AI Data Security

- `analyzeCandidateHybrid` يرسل `application` كاملًا (`aiService.js:17`). يمكن أن يحتوي name/email/CV URLs/experience.
- Smart Assistant يرسل question/role/page/knowledge.
- لا authentication header، consent، redaction، field allowlist، retention notice، أو endpoint allowlist.
- Cloud response schema validation ضعيفة؛ ليس injection إلى HTML، لكنه قد يسبب crash أو توجيه route غير مقصود.
- AI لا ينفذ قرارًا تلقائيًا؛ هذه نقطة إيجابية.

## 9. Browser/Output Security

- React text rendering يهرب النصوص عادة.
- Academic print report يطبق HTML escaping (`AdminDashboard.jsx:89`).
- Recruiter jobs print report يدمج Firestore fields في HTML بلا escaping (`PostPosition.jsx:67`)؛ Stored HTML/script injection ممكن داخل same-origin about:blank print window. التصنيف P1/P2 حسب من يستطيع إدخال بيانات الوظيفة.
- `window.open` للملفات يستخدم `noopener,noreferrer` في components الرئيسية؛ جيد.
- external URL validation يسمح HTTP وليس HTTPS فقط (`validation.js:1-6`).

## 10. Blocked Users

- Login وProtectedRoute يمنعان accountStatus blocked/suspended.
- rules helper `role()` يمنع تلك الحالات في rules الصريحة.
- catch-all يسمح لهم طالما `request.auth != null`.
- NotificationContext وFile API لا يرتبطان بحالة الحساب.
- status change لا يلغِ refresh tokens/session تلقائيًا.

## 11. Dependency/Supply-chain Security

- Multer 1.4.5-lts.1 ضمن نطاق عدة DoS advisories؛ أحدث advisory راجعه التدقيق يتطلب 2.2.0 مع nesting limit.
- lock غير متزامن ويغيب عنه Multer/CORS/Concurrently direct entries؛ التثبيت قد يسحب إصدارات غير موثقة.
- CRA deprecated/long-term stasis، و21 transitive package عليها deprecation metadata.
- لا `engines`, integrity baseline موثق، SBOM، أو CI audit.
- راجع `DEPENDENCY-AUDIT.md` للتفاصيل والمراجع.

## 12. Required Security Acceptance Tests

1. Firebase Emulator deny-by-default matrix لجميع roles وCRUD وownership.
2. Self-escalation attempts لكل sensitive user field.
3. Cross-tenant tests: recruiter A لا يرى/يعدل بيانات recruiter B.
4. Block session mid-use ثم verify Firestore/UI/File API deny.
5. Recruiter provisioning failure injection لكل step مع no false success/no orphan/no password storage.
6. File API: no token, wrong owner, spoofed userId, >25MB, MIME mismatch، magic mismatch، nested fields، aborted upload، rate limit، disk quota.
7. Notification forgery/cross-user mark-read/delete.
8. Audit log tamper attempts؛ actor identity من trusted token.
9. AI payload capture؛ verify allowlisted fields only and no document URLs/email unless explicitly required.
10. Stored content in print report (`<img onerror>`, `<script>`, RTL control chars) must be escaped.

## 13. Immediate Containment Proposal — يتطلب موافقة منفصلة

لا تنفيذ الآن. عند الموافقة، الترتيب المقترح: snapshot/backup محلي آمن، تحقق من ruleset المنشور، وقف تخزين password/rotate secrets، deny-by-default Rules في Emulator، backend provisioning، ثم File API auth. لا تُنشر Rules الجديدة قبل Emulator regression واختبار حساب break-glass Super Admin.
