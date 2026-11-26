# Academia Smart V8 — التخزين المحلي

- تم استبدال Cloudinary/Firebase Storage بخادم ملفات محلي Express مرفق داخل المشروع.
- `npm.cmd start` يشغل React وخدمة الملفات معًا.
- React يعمل على PORT الذي تحدده، وخدمة الملفات تعمل افتراضيًا على `5050`.
- الملفات تحفظ في `server/uploads` ويُحفظ رابطها في Firestore.
- يدعم PDF/Word للـCV وPDF/JPG/PNG/ZIP للشهادات، حتى 10MB.
- يمكن تغيير عنوان API عبر `REACT_APP_FILE_API_URL` والمنفذ عبر `FILE_API_PORT`.

## التشغيل
npm.cmd install
$env:PORT=3009
npm.cmd start

يجب أن يظهر في الطرفية سطر قريب من:
Academia local file API: http://localhost:5050
