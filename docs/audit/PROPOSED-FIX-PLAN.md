# Academia Smart — Proposed Fix Plan

**هذه خطة فقط. لا يبدأ أي إصلاح أو migration دون موافقة صريحة.**  
كل Phase تُنفذ في نطاق صغير، ويُمنع استخدام `PASS` في اسم ZIP إلا بعد Build + Tests + Documentation + Progress Log + Known Issues حسب سياسة المشروع.

## مبادئ التنفيذ

1. لا deploy Rules أو migration قبل Emulator/dry-run/backup وموافقة منفصلة.
2. لا تحفظ password في Firestore ولا تضع server secret في React.
3. كل migration idempotent، له dry-run report وledger وrollback/compensation.
4. الأمن والـdata enforcement قبل تحسينات UI.
5. لا `npm audit fix` ولا `--force`; dependency upgrades targeted.
6. ZIP backups محلية فقط، بعد checkpoint مستقر.
7. preserve historical snapshots ما لم تُعتمد سياسة تحويلها.

## Phase 1 — Reproducible Baseline & Safety Harness

- **الهدف:** جعل النسخة قابلة للتثبيت/build/test بطريقة متكررة دون إصلاح business behavior بعد.
- **Scope:** توثيق Node/npm، مزامنة lock بشكل مضبوط، استبدال CRA test الوهمي باختبارات smoke أساسية، إضافة Firestore Emulator test harness دون نشر Rules.
- **الملفات المتوقع تعديلها:** `package-lock.json`, ربما `package.json` بإذن منفصل، `src/App.test.js`, ملفات tests/config جديدة، README/docs/progress/known issues.
- **Migrations المحتملة:** لا data migration.
- **Risks:** تغير transitive graph؛ warnings/build differences؛ لهذا لا upgrades عشوائية.
- **Rollback:** استعادة الملفات من النسخة الأصلية الحالية؛ لا بيانات حية تتغير.
- **Acceptance tests:** clean install/`npm ci`, `npm run build`, non-watch tests، server syntax، role route smoke، lock unchanged بعد clean install.
- **Dependencies:** اتصال registry مصرح، Node LTS متفق عليه.
- **Complexity:** Medium.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-01-reproducible-baseline-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** build/tests ناجحة؛ lock متزامن؛ docs/progress/known issues محدثة؛ لا تغيير سلوك مقصود.

## Phase 2 — P0 Identity, Recruiter Provisioning & Firestore Rules

- **الهدف:** إغلاق privilege escalation/plaintext password وإنشاء Recruiter account بصورة موثوقة بلا نجاح كاذب.
- **Scope:** backend trusted provisioning (Cloud Function أو Admin SDK service يوافقه المستخدم)، state machine للrequests، field-level Rules deny-by-default، Super/Limited Admin policy وRules tests.
- **الملفات المتوقع تعديلها:** `RecruiterSignUp.jsx`, `AdminDashboard.jsx`, `ProtectedRoute.jsx`, `Login.jsx`, `firestore.rules`, backend/config جديد محتمل، tests/docs.
- **Migrations المحتملة:** إزالة/تنقية password من recruiterRequests الحية؛ إضافة `provisionedUid`, `processedBy`, `processingState`, `failure`; normalize adminLevel/permissions/accountStatus. لا تنفيذ قبل dry-run وbackup.
- **Risks:** lockout للadmins، orphan Auth accounts، downtime إذا Rules سبقت UI/backend.
- **Rollback:** نشر ruleset السابق فقط كإجراء break-glass موثق، واستعادة backend/UI من Phase 1 PASS؛ compensation للحسابات الجزئية. لا إعادة plaintext passwords.
- **Acceptance tests:** full RBAC emulator matrix؛ self-escalation denied؛ legacy admin migration؛ recruiter approve success/failure injection؛ rejection creates no account؛ blocked session denied.
- **Dependencies:** اختيار hosting/backend، Firebase Admin credentials خارج repo، access إلى deployed Rules read-only ثم deploy approval منفصل.
- **Complexity:** Very High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-02-identity-rbac-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** لا password في DB/code flow؛ provisioning atomic/compensated؛ zero P0 Rules tests؛ break-glass verified؛ docs updated.

## Phase 3 — Secure Local File Service & Storage Reconciliation

- **الهدف:** مصادقة upload/read، تطبيق ownership، وتقليل DoS/orphan risk مع friendly errors.
- **Scope:** Firebase ID token verification في API، access policy، strict CORS، env loading/validation، Multer patched line، rate limits/quotas/magic bytes، health sanitization، missing-file API/UI.
- **الملفات المتوقع تعديلها:** `server/index.js`, `utils/fileUpload.js`, `DocumentUploader.jsx`, `UploadDocuments.jsx`, `ReviewDocuments.jsx`, `.env.example`, `package.json/lock`, tests/docs.
- **Migrations المحتملة:** file inventory manifest؛ backfill provider/storagePath/checksum/existence؛ optional relocation من legacy directories. لا نقل/حذف دون approved manifest.
- **Risks:** كسر old URLs، اختلاف Windows paths، ملفات كبيرة/ZIP، token expiry، Multer major changes.
- **Rollback:** تشغيل read-only compatibility resolver مع old paths؛ استعادة code من Phase 2 PASS؛ الملفات لا تُحذف أو overwrite.
- **Acceptance tests:** authorized upload/view، cross-user deny، 25MB boundary، MIME/magic mismatch، aborted/nested multipart، occupied port، restart persistence، ENOENT friendly message.
- **Dependencies:** Phase 2 identity؛ قرار deployment scope للخادم؛ Multer >=patched target.
- **Complexity:** Very High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-03-secure-file-service-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** auth/ownership enforced؛ hostile upload tests pass؛ manifest reconciled؛ no file loss؛ docs/runbook updated.

## Phase 4 — Canonical Data Model & Integrity Migration

- **الهدف:** توحيد الحقول والعلاقات مع الحفاظ على التاريخ.
- **Scope:** schemas/enums/validators؛ `type→employmentType`, statuses, phone, timestamps, application.recruiterId, experienceId، schemaVersion؛ transaction boundaries/counters.
- **الملفات المتوقع تعديلها:** services/schema modules جديدة، Profile/ViewPositions/ViewApplications/TrackApplications/ManagePositions/Interviews/Documents/Notifications، Rules، migration scripts + reports، docs.
- **Migrations المحتملة:** backfill المذكور؛ deterministic application key أو uniqueness ledger؛ interview relation hydration؛ notification schema preparation.
- **Risks:** تحويل تاريخي خاطئ، counter drift، composite indexes، mixed-version clients.
- **Rollback:** additive-first migration؛ لا حذف legacy fields حتى مرحلتين ناجحتين؛ migration ledger + reverse map؛ Phase 3 PASS.
- **Acceptance tests:** dry-run counts repeatable؛ second run no-op؛ before/after invariants؛ orphan report؛ historical fixtures لجميع versions.
- **Dependencies:** Phases 2-3؛ read-only live inventory؛ approved backup.
- **Complexity:** Very High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-04-data-integrity-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** canonical schema in new writes؛ migration verified؛ zero unexplained orphan/counter delta؛ compatibility tests pass.

## Phase 5 — Notifications, Idempotency & Deep Links

- **الهدف:** جعل كل notification قابلًا للوصول للسجل الصحيح مرة واحدة مع read state سليمة.
- **Scope:** canonical notification contract؛ deterministic event IDs/transaction؛ producer registry؛ recruiter all-types UI؛ document-upload notification؛ deep-link routes/section state؛ mark-read separation.
- **الملفات المتوقع تعديلها:** `notificationService.js`, `NotificationContext.js`, Lecturer/RecruiterNotifications، dashboards/App routes، جميع producers، tests/docs.
- **Migrations المحتملة:** normalize `receiver.id/userId/receiverId`, `read/status`, types, target IDs؛ dedupe cautiously by event semantics.
- **Risks:** حذف duplicates شرعية، unread count changes، old links، route authorization.
- **Rollback:** dual-read adapter للlegacy schema؛ لا حذف legacy docs أولًا؛ Phase 4 PASS.
- **Acceptance tests:** document/interview/application/review deep links after login/refresh؛ concurrent producer one event؛ mark all preserves business status؛ badge=list؛ unauthorized target denied.
- **Dependencies:** canonical IDs من Phase 4.
- **Complexity:** High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-05-notifications-deeplinks-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** كل type موثق ومختبر؛ zero known duplicate race؛ deep links functional؛ new document message includes title.

## Phase 6 — Recruitment, Academic, Interviews, Documents & Ratings Completion

- **الهدف:** إغلاق gaps الوظيفية الأساسية بعد تثبيت الأمن والبيانات.
- **Scope:** hide/enforce drafts/deadlines؛ jobs management unified؛ safe-delete full graph؛ meaningful subject codes؛ interview accepted eligibility/legacy hydration/scorecard؛ document versioning/re-upload/application link؛ rating uniqueness/linkage.
- **الملفات المتوقع تعديلها:** Post/Manage/ViewPositions، View/TrackApplications، AdminDashboard، ManageInterviews، Upload/ReviewDocuments، Ratings/Profile، Rules/tests/docs.
- **Migrations المحتملة:** job field cleanup، subject code conflict report، interview snapshots، document versions، rating request linkage.
- **Risks:** تغيير historical display، code collisions، business-policy choices، old status compatibility.
- **Rollback:** additive fields + feature flags؛ preserve old values； Phase 5 PASS.
- **Acceptance tests:** full Lecturer→Recruiter lifecycle؛ academic inactive/history/delete matrix؛ interview conflict concurrency؛ document versions/reviewer notes؛ rating once per approved context.
- **Dependencies:** Phases 4-5؛ قرارات business للeligibility/rating/versioning.
- **Complexity:** Very High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-06-core-workflows-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** end-to-end tests لكل role؛ no draft leak؛ no broken historical record؛ rules and UI agree.

## Phase 7 — Reports, Audit & Admin Operations

- **الهدف:** تقارير موثوقة وقابلة للتصدير وسجل تدقيق قابل للمساءلة.
- **Scope:** unify jobs table في المكان المعتمد؛ filters كاملة؛ CSV/Excel/PDF/Print؛ Academic report metadata/page numbers/messages؛ Audit target resolver/actor snapshot/email/translated permission keys/filters/pagination/export؛ server-trusted audit.
- **الملفات المتوقع تعديلها:** AdminDashboard (يفضل تفكيكه)، Post/ManagePositions، reporting utilities/components، backend audit writer، dependencies/tests/docs.
- **Migrations المحتملة:** enrich audit records additive؛ target snapshots؛ لا rewrite للlogs الأصلية دون ledger.
- **Risks:** spreadsheet injection، print HTML injection، large datasets/client pagination، tamper interpretation.
- **Rollback:** keep original log immutable؛ exports feature flag؛ Phase 6 PASS.
- **Acceptance tests:** formula-injection escaping in CSV/Excel، XSS escaping in print، multi-page PDF/page numbers، date/admin/action filters، exact applicant counts.
- **Dependencies:** trusted audit from Phase 2، canonical model Phase 4.
- **Complexity:** High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-07-reports-audit-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** all required exports/filters pass; audit actor/target readable and immutable; report fixtures approved.

## Phase 8 — AI Governance, i18n/UX, Toolchain & Release Hardening

- **الهدف:** إكمال AI المساعد، توحيد اللغة/الحالات، وتحديث المنظومة بأقل مخاطر.
- **Scope:** AI payload minimization/schema/calibration؛ ranking/compare/missing skills/document note assistant؛ Smart Assistant section awareness؛ canonical localized labels؛ custom validation؛ error/loading/empty/retry/accessibility؛ CRA migration؛ dependency remediation؛ cleanup legacy/dead code.
- **الملفات المتوقع تعديلها:** AI service/components، locales/all UI، routing، build/test configs، package files، README/docs، حذف legacy فقط بموافقة منفصلة.
- **Migrations المحتملة:** bilingual academic labels أو translation keys إذا اعتمدت؛ لا AI-derived decision writes.
- **Risks:** toolchain regression، translation gaps، AI privacy/model variability، deletion of seemingly dead historical code.
- **Rollback:** separate commits/work folders غير مستخدمة هنا؛ local ZIP Phase 7؛ keep CRA until replacement build parity؛ no destructive cleanup without inventory sign-off.
- **Acceptance tests:** cloud failure→local fallback؛ malformed AI response؛ bias/calibration fixtures؛ all roles/pages ar/en RTL/LTR؛ localized validation؛ accessibility smoke؛ production build/bundle; full regression.
- **Dependencies:** stable workflows/contract from prior phases؛ approved AI provider policy.
- **Complexity:** Very High.
- **Local backup ZIP name عند Exit:** `Academia-Smart-PHASE-08-release-hardening-<YYYYMMDD-HHMM>-PASS.zip`.
- **Exit Criteria:** no P0/P1 open؛ accepted P2/P3 documented؛ build/tests/docs/progress/known issues complete؛ release smoke all roles؛ final PASS ZIP only then.

## Suggested Approval Gate Before First Fix

الموافقة المطلوبة يجب أن تحدد صراحة:

1. بدء Phase 1 فقط.
2. Node/npm version المسموح.
3. السماح بتحديث `package-lock.json` وإنشاء test/config files.
4. عدم deploy أو migration في Phase 1.
5. عدم إنشاء أي PASS ZIP حتى تحقق Exit Criteria.

لا تعتبر هذه الوثيقة موافقة، ولا يبدأ التنفيذ تلقائيًا.
