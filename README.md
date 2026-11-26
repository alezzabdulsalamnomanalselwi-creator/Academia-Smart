# Academia Smart

منصة ذكية لاستقطاب وإدارة أعضاء هيئة التدريس بنظام الدوام الجزئي. تدعم المنصة دورة التوظيف من الهيكل الأكاديمي ونشر الوظائف حتى الطلبات والمستندات والمقابلات والتقييمات، مع صلاحيات دقيقة وتجربة عربية/إنجليزية.

## فريق العمل والإشراف

**إشراف:** الدكتور حمزة جامل

**أعضاء الفريق:**
- محمد الغفاري
- العز الصلوي
- أحمد الشايف
- أمير إسحاق
- سعيد القصيع

## الأدوار

- **Super Admin:** إدارة الحسابات والصلاحيات والهيكل الأكاديمي والتقارير وسجل العمليات.
- **Limited Admin:** وصول محدود للتقارير وسجل العمليات بحسب الصلاحيات المعتمدة.
- **Recruiter:** نشر الوظائف، إدارة الطلبات، مراجعة المستندات، المقابلات، التقييمات، ومقارنة المرشحين.
- **Lecturer:** الملف الشخصي، استعراض الوظائف، التقديم، المستندات، المقابلات، التقييمات، والإشعارات.

## المزايا الرئيسية

- Academic hierarchy: University → College → Department → Subject.
- Recruitment workflow: recruiter requests, approval, job posting, and applications.
- Protected documents, interviews, ratings, notifications, and deep links.
- Firebase Authentication, Firestore RBAC, protected Super Admin, and audit logging.
- AI Smart Assistant with a deterministic Smart Local fallback.
- Candidate ranking and comparison with explainable, advisory scoring.
- Arabic/English with RTL/LTR plus Light/Dark/System themes.

## التقنية

- React 18 + React Router + Tailwind CSS.
- Firebase Authentication and Cloud Firestore with Firestore Rules.
- Node.js/Express Local File API with Firebase Admin verification.
- Local protected file storage for the supervised graduation demonstration.

## التشغيل المحلي

### التشغيل بضغطة واحدة (موصى به يوم العرض)

1. فك ضغط حزمة الإصدار في موقع محلي.
2. انقر مرتين على `START-ACADEMIA-SMART.cmd`.
3. في أول تشغيل فقط، قد يثبت المشغّل Node.js LTS رسميًا عبر winget وينفذ `npm ci` من `package-lock.json`.
4. انتظر حتى تُفتح صفحة `http://localhost:3015/login` تلقائيًا.
5. لا تغلق نافذة التشغيل أثناء العرض. استخدم `STOP-ACADEMIA-SMART.cmd` للإيقاف الآمن، و`CHECK-ACADEMIA-SMART.cmd` لفحص جهاز العرض دون تشغيل التطبيق.

تتضمن الحزمة `config/firebase-web.public.env`، وهو إعداد Firebase Web عام للمتصفح وليس Firebase Admin secret. ينشئ المشغّل `.env.local` تلقائيًا منه في أول تشغيل، لذلك لا تحتاج نسخ `.env` يدويًا. يكتشف المشغّل بيانات Firebase Admin محليًا خارج الحزمة عند توفرها؛ غيابها لا يمنع الواجهة، لكنه يمنع عرض ورفع الملفات المحمية.

### المتطلبات

- Node.js 20 LTS أو أحدث متوافق.
- npm.
- إعداد Firebase frontend غير الحساس المتوافق مع بيئتك.
- بيانات Firebase Admin محلية خارج حزمة المصدر عند تشغيل Local File API.

### التثبيت والتشغيل

```powershell
cd "Academia-Smart-v14-Consolidated-Fixes\faculty-recruitment"
npm install
$env:PORT = "3015"
npm start
```

- الواجهة: `http://localhost:3015`
- Local File API: `http://localhost:5050`

راجع [دليل التثبيت](docs/final/INSTALLATION-GUIDE.md) للتفاصيل وحل المشكلات، و[دليل المستخدم](docs/final/USER-GUIDE.md) لسيناريو العرض.

## ملاحظات الأمان والتسليم

- لا تحفظ كلمات المرور أو Service Account JSON أو API keys داخل حزمة المصدر.
- Local File API يتحقق من Firebase ID Token ومن ملكية الملف قبل القراءة أو الرفع.
- حزمة التخرج مناسبة لعرض محلي تحت إشراف. النشر العام ما زال يحتاج تخزين ملفات خاصًا ودائمًا (Billing/provider معتمد).
- لا تتضمن وثائق الحسابات التجريبية كلمات المرور؛ تحفظ محليًا خارج حزمة المصدر فقط.

## التحقق

```powershell
npm run test:security
$env:CI = "true"
npm test -- --watchAll=false --runInBand
npm run build
```

لحدود الإصدار وخطة العرض، راجع `docs/final/`.
