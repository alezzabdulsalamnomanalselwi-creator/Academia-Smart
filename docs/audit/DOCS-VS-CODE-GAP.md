# Academia Smart — Documentation vs Actual Code Gap

## Reading Baseline

- `README.md` هو README افتراضي لـCreate React App؛ لا يوثق المعمارية أو البيانات أو التشغيل الفعلي على 3013/5050.
- لم يكن `docs/INDEX.md`, `docs/`, أو `codex-prompts/` موجودًا قبل Phase 0.
- الوثائق الفعلية موزعة في ملفات `FINAL-*`, `V*-CHANGELOG-AR.md`, `MASTER-CHECKLIST-AR.md`, `START-HERE.txt`.
- changelogs تجمع “implemented” و“still open”، وبعض الادعاءات لا تطابق الكود الحالي.

### Legend

- **Complete:** موجود بالكود ضمن النطاق، مع قيود بسيطة فقط.
- **Partial:** جزء فعلي موجود لكن requirement أو enforcement غير مكتمل.
- **Missing:** لا implementation فعلي.
- **Broken:** الكود موجود لكنه لا يحقق النتيجة المطلوبة أو به عيب أساسي.
- **Test evidence:** “يدوي سابق” يعني evidence مقدم في طلب التدقيق، لا test artifact داخل المشروع.

## Requirements Matrix

| # | Requirement | Documented | Implemented | Test evidence available? | Status | Code evidence / gap |
|---:|---|---|---|---|---|---|
| 1 | Project structure/start | START-HERE/V8/V14 | Main app nested؛ batch + concurrently | build سابق موصوف فقط | Partial | root duplicate؛ lock غير متزامن؛ `START-ACADEMIA-SMART.bat:3-10` |
| 2 | React architecture | README لا يصفه | SPA + role dashboards | لا automated architecture tests | Partial | `App.js:41-76`; dashboard sections local state |
| 3 | Routes/guards | V11 | role routes + 404/unauthorized | UI سابق | Partial | `App.js:47-69`, `ProtectedRoute.jsx`; لا section routes/deep links |
| 4 | Lecturer workflow | changelogs | profile/jobs/applications/docs/ratings/notifications | يدوي جزئي | Partial | `LecturerDashboard.jsx:58-101` |
| 5 | Recruiter workflow | changelogs | broad modules | يدوي جزئي | Partial | `RecruiterDashboard.jsx:61-125` |
| 6 | Admin workflow | V2/V11/V14 | single dashboard tabs | يدوي جزئي | Partial | `AdminDashboard.jsx` |
| 7 | Super Admin | FINAL-SETUP/V11/V13 | UI legacy/super checks + create limited admin | UI سابق | Partial | client-side Auth creation؛ Rules mismatch |
| 8 | Limited Admin UI | V11/V12 | tab hiding by permissions | يدوي نجح | Complete UI only | `AdminDashboard.jsx:38-46,96` |
| 9 | Limited Admin route enforcement | checklist | admin route role فقط | لا | Partial | `App.js:52-58`; no per-tab route |
| 10 | Limited Admin data/action enforcement | checklist | بعض Rules permissions | لا emulator tests | Broken if local Rules deployed | catch-all `firestore.rules:46` |
| 11 | Protect Super Admin | V11/V13 | self UI guard فقط | لا | Broken security | mutable user fields + catch-all |
| 12 | Firebase Authentication | README/setup | Email/password/reset | يدوي login/reset غير مكتمل | Partial | `Login`, `SignUp`, `Forgot/Reset` |
| 13 | Recruiter signup dynamic universities | V14 | query active universities | يدوي نجح | Complete | `RecruiterSignUp.jsx:25-40`; ليست قائمة ثابتة |
| 14 | Recruiter approval provisioning | requirement | status update فقط | يدوي فشل | Broken P0 | `AdminDashboard.jsx:57` |
| 15 | Recruiter rejection no account | requirement | status rejected فقط | يدوي نجح | Complete | نفس `processRequest`; لا account creation |
| 16 | Firestore collections/model | متفرق | 13 collections مستعملة | لا schema test | Partial | راجع DATA-MODEL-AS-IS |
| 17 | Firestore Security Rules | V11/FINAL-SETUP | ملف موجود | deployment مجهول | Broken P0 | recursive signed-in catch-all |
| 18 | Local File API | V8/V11/V12 | Express/Multer/static/health | يدوي new files نجح | Partial | no auth؛ `.env` not loaded；`server/index.js` |
| 19 | 25MB limit | V12 | client + server default | يدوي غير موثق هنا | Complete | `fileUpload.js:28-33`, `server/index.js:11,30` |
| 20 | server/uploads persistence | V8 | default folder exists | current inventory 0 files | Partial | no backup/retention/external dir loader |
| 21 | Old file ENOENT migration/friendly error | requirement | لا migration/handler | يدوي ENOENT | Missing | raw static file error only |
| 22 | MIME/size validation | V11 | ext + client MIME + server MIME | لا hostile-file test | Partial | no magic bytes; `server/index.js:19-31` |
| 23 | CORS | V11 | configurable function | لا | Partial/unsafe default | allow all when empty; Node ignores `.env` |
| 24 | Upload/download/preview | V8 | upload + public URL + anchors | يدوي new works | Partial | no auth/friendly missing file/versioning |
| 25 | Notifications send/receive/badge | V3/V6/V11 | Context + producers | يدوي works | Partial | recruiter list filters only two types |
| 26 | unread/read state | V11 | `read`, mark all | يدوي counter works | Broken schema edge | mark all overwrites business `status` |
| 27 | Deep Links | V11/checklist | deepLink field produced | يدوي fails | Broken | dashboards ignore query string/field |
| 28 | eventKey/idempotency | V11 | helper in four flows | لا concurrency test | Partial | query-then-add non-atomic; many direct addDoc |
| 29 | New document notification to recruiter | requirement | لا producer | لا/expected missing | Missing | `UploadDocuments.jsx:95-124` |
| 30 | Document review + note + lecturer result | V6 | update + notification | يدوي works | Complete basic | `ReviewDocuments.jsx:33-75`; title included in message |
| 31 | Document name in result notification | requirement | موجود | يدوي improvement requested | Complete in code | `ReviewDocuments.jsx:51-56` |
| 32 | AI document review notes | requirement | لا UI/service | لا | Missing | no Suggest/Rewrite/Shorten/Formalize |
| 33 | Universities/Colleges/Departments/Subjects CRUD | V2/V11/V14 | add/edit/toggle/delete UI | يدوي نجح | Partial | client uniqueness/safe-delete limited; Rules unsafe |
| 34 | Inactive parent hidden in child selectors | checklist/V14 | filtered in Admin/Post/Profile/signup | يدوي نجح | Complete UI | `AdminDashboard.jsx:92`, `PostPosition.jsx:45-48`, `Profile.jsx:208-209` |
| 35 | Historical child remains | checklist | toggle لا cascade/delete | يدوي نجح | Complete basic | data stays; selectors hide inactive |
| 36 | Safe Delete all relations | checklist | direct children + positions فقط | يدوي university relation نجح | Partial | `AdminDashboard.jsx:62-64`; misses historical collections |
| 37 | Duplicate prevention academic | checklist | normalized client arrays | يدوي نجح | Partial | race/no Rules uniqueness |
| 38 | Subject code meaningful/stable | V13 | IT/CS/AI/CSAI heuristics؛ name edit preserves | يدوي fallback SUB101 | Partial | `AdminDashboard.jsx:60,67`; race/fallback |
| 39 | Jobs post/draft/status/edit/copy | V11/V13 | موجود | يدوي cards page exists | Partial | draft leaks to Lecturer; dual type fields |
| 40 | “الوظائف التي أنشأتها” table | V13 | أسفل PostPosition | يدوي قال غير ظاهر في Manage | Partial/location mismatch | `PostPosition.jsx:279-281`; ManagePositions cards only |
| 41 | Jobs table Search | V13 | generic text search | لا | Complete basic | `PostPosition.jsx:54-66,279` |
| 42 | Academic/employment/deadline filters | requirement | status only + generic search | لا | Missing/Partial | لا filters منفصلة |
| 43 | Applicants count | V11/V13 | counter في table؛ real count في Manage cards | يدوي غير محدد | Partial | denormalized counter may drift |
| 44 | Jobs PDF/Print | V13 | browser print report | يدوي PDF سابق؟ | Complete basic | `PostPosition.jsx:67-68,281` |
| 45 | Jobs CSV/Excel | requirement | لا implementation/library | لا | Missing | no CSV/xlsx references |
| 46 | Applications submit/track/status/timeline | V11 | موجود | يدوي جزئي | Partial | non-atomic duplicates; lecturer status labels incomplete |
| 47 | Rejection reason mandatory | V11 | UI checks nonempty | لا Rules test | Complete UI only | `ViewApplications.jsx:105-121` |
| 48 | Interviews lifecycle | V11 | schedule/reschedule/complete/cancel/no-show | يدوي نجح | Complete basic | `ManageInterviews.jsx:19-27` |
| 49 | Interview job relation | V11 | new writes IDs/title | يدوي “وظيفة غير محددة” | Partial | legacy hydration absent |
| 50 | Online link/In-person location | checklist | validation موجود | يدوي جزئي | Complete UI | `ManageInterviews.jsx:20,26` |
| 51 | Interview conflict prevention | V11 | 45-minute client check | يدوي غير محدد | Partial | no transaction/server enforcement |
| 52 | Interview duplicate notifications | V11 | eventKey helper | لا concurrency test | Partial | non-atomic |
| 53 | Ratings | legacy docs | request/respond/rating collection | يدوي غير شامل | Partial | no rating uniqueness/application linkage; Rules catch-all |
| 54 | Academic Report hierarchy | V14 | hierarchy UI + detailed print table | يدوي works | Complete basic | `AdminDashboard.jsx:85-100` |
| 55 | Academic report manager/email/time/pages/status/messages | requirement | manager name + time + level statuses | يدوي PDF works | Partial | email/page numbers missing; no-subject message generic |
| 56 | Audit Log labels/name/search/pagination | V14 | موجود جزئيًا | يدوي تحسن | Partial | `AdminDashboard.jsx:80-84,106` |
| 57 | Audit target names/admin email/permission labels | requirement | target raw؛ name فقط؛ details raw keys | يدوي gap | Missing/Partial | no resolvers/email/map |
| 58 | Audit structured filters/PDF/Print | requirement | generic search + pagination فقط | لا | Missing | no date/action/admin controls/export |
| 59 | Audit integrity | checklist | adminLogs append UI | لا | Broken security | client writer + catch-all + silent failure |
| 60 | Reports CSV/Excel generally | checklist | none | لا | Missing | no dependency/code |
| 61 | Hybrid AI Cloud + Local | V6/V11 | موجود candidate/job/assistant | لا automated fallback test | Complete basic | timeouts + fallback functions |
| 62 | Match score/explain/strengths/gaps/questions | Final/V6 | score, strengths, gaps, recommendation, questions | يدوي غير موثق | Partial | simplistic/inflated scoring; no calibrated explain |
| 63 | Candidate ranking/compare | checklist | لا | لا | Missing | individual analysis only |
| 64 | Missing skills | checklist | generic gaps فقط | لا | Partial | no structured job-vs-skill gap |
| 65 | Job description assistant | V11 | Cloud/local suggestion editable | لا | Complete basic | `PostPosition.jsx:98-109` |
| 66 | CV completeness | checklist | profile completeness percentage | لا | Partial | not AI/document-content analysis |
| 67 | Smart Assistant role/page awareness | V11 | role + pathname + KB | لا | Partial | dashboard subsection not in URL |
| 68 | Smart Assistant local fallback | V11 | موجود | لا failure test | Complete in code | `SmartAssistant.jsx:40-52` |
| 69 | AI assists, no auto decision | Final/V6 | disclaimer/no auto write | code evidence | Complete | `AcademiaSmartAI.jsx:5`, `aiService.js` |
| 70 | Arabic/English/RTL/LTR | changelogs/checklist | provider + equal key sets | manual mixing reported | Partial | hardcoded RTL/text/data enums |
| 71 | Native validation localized | requirement | HTML `required/type/min` widespread | manual English messages | Broken UX | Login/Signup/PostPosition/Interviews/Profile وغيرها |
| 72 | Error Boundary/404/Unauthorized | V11 | موجود | لا tests | Complete basic | `components/system/*` |
| 73 | Loading/Empty/Error states | checklist | loading/empty كثير؛ error متفرق | لا | Partial | console-only paths, no retry |
| 74 | Environment variables | V11/setup | frontend config + `.env.example` | current names inspected | Partial | Node doesn't load `.env`; actual AI/file vars absent |
| 75 | Secrets | docs تحذر AI key | `.env` + hardcoded Cloudinary identifiers | لا secret scan artifact | Partial/unsafe | potential CLOUDINARY_URL secret; no values exposed in audit |
| 76 | Build | README/changelogs claim prior success | script موجود | current FAIL | Broken baseline | missing node_modules + stale lock |
| 77 | Tests | CRA README | one stale CRA test | لا valid tests | Missing | `App.test.js:4-7` expects learn react |
| 78 | Dependency risks | checklist | package manifests | warnings previously | High risk | Multer vulnerable, CRA deprecated, lock drift |
| 79 | EADDRINUSE 5050 handling | requirement | لا preflight | historical issue | Missing | concurrently start only |
| 80 | Legacy/dead code cleanup | checklist | لم ينفذ | static evidence | Missing | root duplicate, unused modules/assets/template docs |

## Major Documentation Contradictions

1. **V13 يقول Admin creation ناجح وآمن للجلسة:** secondary Auth يمنع logout، لكنه ما زال client-side، غير ذري، وسيفشل مع Rules محكمة بلا backend trusted provisioning.
2. **V12 يقول legacy Admin يحتفظ بكامل الصلاحيات:** صحيح UI، غير صحيح في Rules الصريحة.
3. **V11 يقول Firestore Rules/RBAC فعلي:** الملف موجود لكن catch-all يلغي enforcement.
4. **V11 يقول Local File API CORS مضبوط:** function موجود، لكن default يسمح الجميع وNode لا يحمل `.env`.
5. **V11 يقول notification idempotency مشتركة:** helper موجود لكن عدة flows تتجاوزه، والعملية غير ذرية.
6. **V13 يقول جدول الوظائف:** موجود فعليًا، لكنه في PostPosition لا ManagePositions، ولا CSV/Excel/filters المطلوبة.
7. **V6 يقول تحسين candidate القديم:** ManageInterviews الحالي لا يحل missing job title للسجلات القديمة.
8. **FINAL-DEVELOPMENT/V5 يتحدثان Firebase Storage:** V8 غيّر إلى local، لكن config/docs/dead code ما زالت تجمع مزودي تخزين متعددين.
9. **README:** لا علاقة له بالنظام الحالي، المنفذ، Firebase، File API، AI، أو roles.

## Documentation Needed Later

- `docs/INDEX.md` يربط architecture/data/security/runbook/testing/migrations/known issues/progress.
- README فعلي مع prerequisites، exact directory، ports، env ownership، no-secret rules، startup/shutdown.
- canonical schema/enums وnotification contract.
- RBAC permission matrix + Rules tests.
- file storage runbook/backup/restore/orphan reconciliation.
- AI data policy/fallback behavior/limitations.
- release checklist التي تمنع PASS دون build/tests/docs/progress/known issues.
