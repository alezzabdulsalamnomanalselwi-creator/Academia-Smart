# القيود المعروفة للإصدار

## SAFE_FOR_GRADUATION_DEMO

- `Graduation Local Demo = READY` لعرض محلي مشرف عليه.
- Local File API الحالي آمن للعرض المحلي، لكنه ليس تخزينًا عامًا دائمًا.
- Cloud AI اختياري وغير مهيأ؛ Smart Local يبقي المساعد متاحًا.
- مخاطر CRA/build-tool legacy موثقة ومؤجلة؛ Runtime gate المعتمد لا يحوي Critical أو High.
- بعض تحسينات البنية المستقبلية، مثل audit موثوق بالكامل وتوسيع notification producer hardening، مؤجلة.

## NOT_AFFECTING_CORE_DEMO

- Firebase durable private storage يحتاج Billing/provider معتمد قبل نشر عام على الإنترنت.
- تخزين الملفات الحالي لا يقدم SLA أو backup/restore durability للنشر العام.
- يلزم backend موثوق وسياسات privacy/retention/rate limits قبل تفعيل Cloud AI في بيئة توظيف فعلية.
- تحسينات accessibility والتقارير وsubject-code fallback يمكن تنفيذها لاحقًا.

`Public Deploy Gate = NOT READY` فقط إلى أن يتوفر تخزين ملفات خاص ودائم معتمد. لا يؤثر ذلك على جاهزية عرض التخرج المحلي.
