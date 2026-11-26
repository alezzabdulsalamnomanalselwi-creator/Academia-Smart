# دليل التثبيت والتشغيل المحلي

## التشغيل بضغطة واحدة

بعد فك ضغط الحزمة، انقر مرتين على `START-ACADEMIA-SMART.cmd` من جذر المشروع. يفحص المشغّل Node/npm، وينفذ `npm ci --no-audit --no-fund` عند غياب الحزم، وينشئ `.env.local` تلقائيًا من `config/firebase-web.public.env`، ويبدأ API على 5050 والواجهة على 3015، ثم يفتح صفحة الدخول تلقائيًا.

- **أول تشغيل:** قد يطلب Windows تأكيد تثبيت Node.js LTS الرسمي عبر winget، ثم تنزيل الحزم.
- **التشغيل العادي:** يتحقق من البيئة ويبدأ بسرعة دون إعادة تنزيل الحزم.
- **فحص الجهاز:** انقر `CHECK-ACADEMIA-SMART.cmd`؛ لا يشغّل التطبيق ولا يغير البيانات.
- **الإيقاف:** انقر `STOP-ACADEMIA-SMART.cmd`؛ يوقف فقط عمليات Node التي بدأها المشغّل وتتبع للمشروع.

لا تغلق نافذة تشغيل المشغّل أثناء العرض. تظل سجلات التشغيل المؤقتة في `runtime/` وهي مستبعدة من حزمة التسليم.

`firebase-web.public.env` يحتوي إعداد Firebase Web العام المطلوب للمتصفح فقط. لا يحتوي ولا يستبدل Firebase Admin credential؛ يبقى ذلك الملف الخاص خارج الحزمة عبر `GOOGLE_APPLICATION_CREDENTIALS` أو المسار المحلي الآمن المكتشف.

## 1. المتطلبات

- Windows 10/11.
- Node.js 20 LTS أو إصدار أحدث متوافق، مع npm.
- اتصال إنترنت عند الحاجة إلى Firebase Authentication أو Firestore.
- إعداد Firebase frontend غير الحساس المطلوب للمشروع.

## 2. تثبيت الحزم

من مجلد المصدر الذي يحتوي `package.json`:

```powershell
npm install
```

## 3. إعداد Firebase

إعداد React يستخدم Firebase frontend configuration المسموح مشاركته مع العميل. لا تضف Service Account أو مفتاحًا خاصًا إلى المشروع أو إلى `.env` المشترك.

لتشغيل Local File API مع الوصول المحمي للملفات، احفظ ملف Firebase Admin credential خارج حزمة المصدر في موقع محلي حساس، ثم عيّن متغير الجلسة فقط:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure-local-path\firebase-admin-service-account.json"
$env:FIREBASE_PROJECT_ID = "my-project-51bb7"
```

لا تضع هذا المسار أو محتوى الملف في README أو ملفات المصدر أو أرشيف التسليم.

## 4. تشغيل التطبيق

```powershell
$env:PORT = "3015"
npm start
```

- React: `http://localhost:3015`
- Local File API: `http://localhost:5050`

يمكن تشغيلهما منفصلين عند الحاجة:

```powershell
$env:PORT = "3015"; npm run start:web
npm run start:api
```

## استكشاف المشكلات

### `EADDRINUSE :::5050`

هناك Local File API قديم يعمل على المنفذ 5050. أوقف العملية القديمة من Terminal/Task Manager ثم شغّل `npm run start:api` مرة واحدة. لا تشغّل نسخًا متعددة من الخادم.

### `EADDRINUSE :::3015`

أوقف React dev server القديم أو استخدم منفذًا آخر للجلسة الحالية، ثم افتح المنفذ المطابق في المتصفح.

### PowerShell يمنع `npm.ps1`

استخدم `npm.cmd install` و`npm.cmd start` للجلسة الحالية، أو طبّق سياسة التنفيذ المؤسسية المسموح بها. لا تغيّر سياسة النظام دون موافقة مسؤول الجهاز.

### `package.json` غير موجود

أنت في المجلد الخطأ. انتقل إلى مجلد `faculty-recruitment` الذي يحتوي `package.json` ثم أعد الأمر.

### Local File API credentials missing

تحقق من أن `GOOGLE_APPLICATION_CREDENTIALS` يشير إلى ملف محلي صالح خارج المشروع، وأن `FIREBASE_PROJECT_ID` يطابق المشروع. لا تنسخ credential إلى source tree.
