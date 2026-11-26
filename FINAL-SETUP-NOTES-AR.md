# Academia Smart — إعدادات لازمة قبل Final

## 1) صفحة Reset Password داخل Academia Smart
الكود يحتوي `/reset-password` لمعالجة `oobCode`، لكن Firebase يجب أن يُضبط من Authentication → Templates → Password reset على **Custom action URL** يشير إلى رابط التطبيق المنشور `/reset-password` حتى لا تظهر صفحة Firebase الافتراضية. هذا إعداد Console وليس شيئًا يمكن للواجهة فرضه وحدها.

## 2) Super Admin
اجعل حساب المدير الرئيسي في مستند `users/{uid}` يحتوي أحد الخيارين:
```json
{ "role":"admin", "adminLevel":"super", "permissions":["*"] }
```
أو `isSuperAdmin: true`.
المدير المحدود يستخدم `adminLevel: "limited"` و`permissions` مثل `users.manage`, `academic.manage`, `audit.view`.

## 3) Firestore Rules
يوجد ملف `firestore.rules` مقترح. يجب مراجعته ثم نشره من Firebase CLI/Console بعد Backup. لا يتم نشر Rules تلقائيًا بتشغيل React.

## 4) Local File API
شغّل المشروع بـ `npm.cmd start`. الواجهة والخادم المحلي يعملان معًا. إعداد الرابط في `.env` عبر `REACT_APP_FILE_API_URL`، وإعدادات الخادم موجودة في `.env.example`.

## 5) AI Hybrid
إذا `REACT_APP_AI_API_URL` فارغ أو تعطل، يعمل Local AI وSmart Assistant محليًا تلقائيًا. لا تضع مفتاح API سري داخل React.
