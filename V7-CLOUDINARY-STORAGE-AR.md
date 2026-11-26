# Academia Smart V7 — نقل رفع الملفات إلى Cloudinary

## لماذا تم التغيير؟
أظهر اختبار Firebase Console أن Cloud Storage يتطلب ترقية خطة المشروع، ولذلك كان رفع الملفات من الجهاز يتوقف عند 0% أو "جاري التقديم".

## ما الذي تغير؟
- تم إيقاف استخدام Firebase Storage لرفع مستندات المستخدمين.
- يتم رفع CV والشهادات والمستندات مباشرة إلى Cloudinary.
- يبقى Firebase Authentication وCloud Firestore كما هما.
- يتم حفظ رابط Cloudinary وpublic_id وبيانات الملف في Firestore.
- يوجد progress حقيقي أثناء الرفع وtimeout ورسالة خطأ واضحة.
- رفع الصورة الشخصية الموجود سابقاً على Cloudinary لم يتغير.

## إعداد Cloudinary
المشروع يستخدم Cloud Name الموجود في REACT_APP_CLOUDINARY_CLOUD_NAME، ويستخدم Upload Preset غير موقّع (Unsigned).
القيمة الحالية الاحتياطية للـ preset هي profilePic للتوافق مع الإعداد الموجود سابقاً.

إذا رفض Cloudinary ملفات PDF/Word/ZIP، أنشئ Upload Preset جديداً من Cloudinary Console باسم مثلاً academia_documents، واجعله Unsigned ويسمح بأنواع الملفات المطلوبة، ثم ضع في .env:
REACT_APP_CLOUDINARY_DOCUMENT_UPLOAD_PRESET=academia_documents

## اختبار القبول
1. سجل دخول كمحاضر.
2. افتح رفع المستندات.
3. اختر PDF صغيراً.
4. يجب أن يتحرك progress من 0 إلى 100.
5. بعد النجاح يجب أن يظهر المستند عند مسؤول التوظيف ويفتح رابط Cloudinary الصحيح.
6. اختبر أيضاً رفع CV من الملف الشخصي والشهادات.
