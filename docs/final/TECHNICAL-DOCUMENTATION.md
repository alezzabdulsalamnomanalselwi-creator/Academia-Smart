# التوثيق التقني

## Architecture

React SPA تتصل بـFirebase Authentication وCloud Firestore. Local File API مبني على Node.js/Express ويؤمن الرفع والقراءة الخاصة للملفات. لا تدخل بيانات Firebase Admin إلى المتصفح أو إلى حزمة المصدر.

## Frontend

- React 18 وReact Router لواجهات الدور والصفحات المحمية.
- LanguageContext للنصوص الثابتة واتجاه RTL/LTR.
- ThemeContext لحالات Light/Dark/System.
- Smart Assistant يقدم إرشادًا واعيًا بالدور والصفحة.

## Firebase and RBAC

- Firebase Authentication هو مصدر هوية الجلسة.
- Firestore `users` يحدد role وaccount status وadmin level وpermission keys.
- Firestore Rules تعمل بمنهج deny-by-default وتتحقق من الدور والملكية.
- Super Admin صريح ومحمي؛ Limited Admin لا يتجاوز صلاحياته الممنوحة.

## Local File API

- يتلقى Firebase ID token في `Authorization: Bearer` ويتحقق منه باستخدام Firebase Admin.
- يتحقق من المستخدم النشط وعلاقة المالك/Recruiter/الكيان قبل تقديم الملف.
- يطبق حد 25MB وفحص الامتداد وMIME وmagic signature ومسارات آمنة وCORS مضبوطًا.
- استجابة القراءة المحمية تستخدم authenticated fetch/Blob في الواجهة عند الحاجة، فلا تفتح URL خاصًا دون التفويض.

## Data model and workflows

التسلسل الأكاديمي هو University → College → Department → Subject. الوظيفة ترتبط بالتسلسل والمنشئ، والطلب يربط Lecturer وRecruiter والوظيفة. المستندات والمقابلات والتقييمات تحتفظ بعلاقات الطلب والمالك/المراجع اللازمة للتحقق من الملكية.

## Notifications and audit

الإشعارات تستخدم recipients وtargets وdeep links ومفاتيح event idempotency للمنتجين الحاليين. تسجيل audit يعرض labels مترجمة فقط؛ تبقى مفاتيح العملية الخام وقيمها المخزنة دون تغيير.

## AI

Candidate ranking/compare ذو حساب deterministic قابل للتفسير ويعرض strengths/gaps/completeness كمساعدة فقط. Smart Local fallback متاح عندما لا يكون Cloud AI مهيأً. Cloud AI اختياري ويحتاج backend موثوقًا وسياسات خصوصية واحتفاظ ومراقبة قبل استخدامه في بيئة حقيقية.

## Security model

الإذن لا يعتمد على الدور القادم من العميل. Auth وFirestore Rules وbackend ownership checks تعمل معًا. لا تخزن كلمات مرور plaintext في Firestore، ولا يتم تضمين credentials أو tokens أو private keys في المصدر أو Release ZIP.
