# Academia Smart - Final Development

## إضافات هذه الدفعة
- رفع CV مباشرة من الجهاز إلى Firebase Storage (PDF/Word، حتى 10MB).
- رفع الشهادات والمرفقات مباشرة (PDF/JPG/PNG/ZIP، حتى 10MB).
- حفظ رابط الملف تلقائياً في ملف المحاضر مع إمكانية المعاينة.
- Academia Smart AI داخل طلبات المتقدمين: نسبة توافق تفسيرية، نقاط قوة، نقاط تحتاج مراجعة، وتوليد أسئلة مقابلة مقترحة.
- AI هو مساعد قرار فقط ولا يقبل/يرفض المرشح تلقائياً.
- نظام الإشعارات والعداد وToast الثابت من Batch2 محفوظ كما هو.
- ربط الهيكل الأكاديمي ومنع التكرار من v3 محفوظان.
- إضافة Babel workaround إلى devDependencies لتقليل تحذير CRA المعروف.

## مهم لرفع الملفات
يجب أن يكون Firebase Storage مفعلاً للمشروع وأن تسمح Storage Rules للمستخدم المسجل برفع ملفاته. إذا ظهر Permission Denied فهذا إعداد Firebase Rules وليس خطأ في واجهة الرفع.

## التشغيل
npm.cmd install
$env:PORT=3005
npm.cmd start

ثم افتح http://localhost:3005
