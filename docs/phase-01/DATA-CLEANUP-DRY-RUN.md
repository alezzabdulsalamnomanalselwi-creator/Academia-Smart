# Data Cleanup Dry Run — Phase 1

**الحالة:** REPORT ONLY / NO LIVE READ / NO MIGRATION.  
لا توجد credentials أو export حي مصرح به، لذلك الأعداد التالية `NOT_MEASURED` وليست صفرًا.

| Dataset / field | Count | Risk | Proposed action after separate approval |
|---|---:|---|---|
| `recruiterRequests.password` | NOT_MEASURED | P0 secret at rest | export encrypted backup approved، map request/account state، ثم delete field only؛ لا log/use/copy |
| pending legacy requests بلا `authUid` | NOT_MEASURED | لا يمكن approval آمن | account recovery workflow أو طلب إعادة التسجيل؛ لا استخدام plaintext password |
| approved requests بلا `provisionedUid`/users | NOT_MEASURED | false historical approval | reconcile email/Auth/users، produce per-record plan، no automatic activation |
| staged Auth users بلا request/users | NOT_MEASURED | orphan identities | list disabled users created by new flow؛ delete only with verified absence and approval |
| legacy admin بلا `adminLevel/permissions` | NOT_MEASURED | compatibility super fallback | identify intended Super Admin UID، set explicit fields، then remove fallback in later rules |
| users with unsafe/malformed security fields | NOT_MEASURED | privilege ambiguity | report role/status/adminLevel/permissions frequency؛ no normalization yet |
| applications بلا `recruiterId` | NOT_MEASURED | legacy relationship lookup | derive from position owner additively، preserve historical snapshots |
| local file references بلا physical file | NOT_MEASURED | FILE_NOT_FOUND | manifest path/provider/existence/checksum؛ no move/delete in Phase 1 |
| rejected request with `authCleanupPending=true` | NOT_MEASURED | disabled Auth orphan | verify no users doc and Auth disabled before deletion |

## Proposed Read-Only Dry Run Procedure

1. استخدام Firebase Admin credentials مؤقتة read-only قدر الإمكان وفي بيئة محلية آمنة.
2. عدم طباعة email الكامل أو password values؛ reports تستخدم counts وmasked IDs.
3. إخراج JSON/CSV manifest محلي مشفّر خارج repository إن احتوى identifiers.
4. التحقق من invariant counts مرتين.
5. تقديم migration plan وrollback لكل مجموعة وانتظار موافقة منفصلة.

## Explicitly Not Performed

- لم تُقرأ Firestore live data.
- لم تُقرأ أو تُنقل أو تُحذف password values.
- لم يُعدل Auth user أو document حي.
- لم تُنقل ملفات `server/uploads`.
