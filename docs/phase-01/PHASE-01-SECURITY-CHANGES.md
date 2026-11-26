# Phase 1 Security Changes

## Closed or Contained

- **P0 catch-all:** أزيل؛ unknown collections denied.
- **P0 plaintext recruiter password:** لا password في Firestore request الجديد؛ Auth creation على backend فقط.
- **P0 false recruiter approval:** لا success قبل Auth + users + request + audit؛ failure keeps/restores pending.
- **P0 self escalation:** client cannot change role/permissions/adminLevel/status.
- **P0 Super Admin protection:** Limited Admin cannot mutate Super Admin; sensitive user changes backend-only.
- **P1 ownership:** applications/documents/interviews/ratings/notifications/verifications مقيدة بالأطراف.
- **P1 blocked sessions:** Firestore checks status per request، frontend profile snapshots، backend token revocation/checkRevoked.
- **P1 File API:** auth, authorization, CORS allowlist, MIME/ext/magic, 25MB, traversal, rate limit, safe errors.
- **P1 idempotency:** recruiter claim transaction؛ deterministic critical audit؛ deterministic notification event documents.
- **P1 read-state corruption:** Mark All Read no longer overwrites business status.
- **P1 sensitive teaching verification:** lecturer payload cannot set trusted verification fields.

## Residual Security Risks

1. Rules compiled and passed the Phase 1A Emulator matrix (21/21)، لكنها لم تُنشر؛ production ruleset unknown.
2. Backend privileged endpoints تحتاج ADC/service account خارج repo وHTTPS؛ لم تُختبر مع token حقيقي.
3. Legacy recruiter requests بلا `authUid` تحتاج recovery منفصلة؛ لا تستخدم password القديم.
4. رفض request يحذف staged Auth best effort؛ `authCleanupPending` قد يحتاج cleanup approved لاحقًا.
5. In-memory rate limiting لا يكفي لعدة instances؛ production يحتاج shared limiter/reverse proxy.
6. Magic-byte check لا يساوي malware/antivirus scan.
7. External Cloudinary/CV URLs لا تخضع لLocal File API authorization.
8. `legacySuperAdmin` compatibility ينبغي إزالته بعد dry-run/migration؛ إبقاؤه دائمًا غير مفضل.
9. npm audit: 6 critical و60 high packages ضمن tree؛ major toolchain remediation لم تُنفذ.
10. Admin audit للأعمال الأكاديمية القديمة ما زال client-authored؛ العمليات الأمنية الجديدة فقط trusted backend.

## Phase 1A Runtime Correction

- كشف Emulator أن notification receiver كان يستطيع تغيير `status/actionTakenBy` مباشرة.
- قُيد client update إلى `read/readAt` فقط.
- نُقلت إجراءات الإشعار الوظيفية المسموحة إلى backend موثوق يتحقق من role والreceiver ونوع الإشعار والإجراء.

## No Secrets Policy

- لا service-account JSON في source أو ZIP.
- لا متغير backend يبدأ بـ`REACT_APP_` إذا كان سريًا.
- `.env` استُبعد من backups ولم تُطبع قيمه.
- الأخطاء الخادمية تسجل code/name فقط ولا ترجع stack أو absolute paths.
