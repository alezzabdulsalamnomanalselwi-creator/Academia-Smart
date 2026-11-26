# Academia Smart — Dependency Audit

**تاريخ البيانات:** 2026-08-29  
**لم يُنفذ أي upgrade أو install أو audit fix.**

## Baseline Result

- `node_modules` غير موجود.
- `npm run build` فشل فورًا لأن `react-scripts` غير متاح.
- `package-lock.json` lockfileVersion 3 موجود، لكنه لا يطابق `package.json` الحالي.
- root lock metadata لا يحتوي dependencies المباشرة: `express`, `multer`, `cors`, `concurrently`، ولا devDependency الفعلية `@babel/plugin-proposal-private-property-in-object`.
- يوجد Express 4.21.2 transitive lock entry، لكنه ليس ضمانًا لتلبية direct dependency بعد install.
- لا يوجد Multer/CORS/Concurrently lock entry.
- `npm audit --package-lock-only` online لم يكتمل بسبب الشبكة وأُوقف دون تعديل.
- `npm audit --offline` أعاد 0 findings للـlock القديم فقط؛ هذه النتيجة **غير صالحة كإثبات أمان** لأنها لا تشمل الاعتماديات الجديدة غير المقفلة وتعتمد cache محليًا.

## Direct Dependencies

| Package | Declared | Locked | Deprecated? | Security/Risk | Recommended action | Breaking risk |
|---|---:|---:|---|---|---|---|
| react | ^18.3.1 | 18.3.1 | لا | إصدار ثابت في lock؛ upgrade major يتطلب اختبار APIs/rendering | أبقِه مؤقتًا في security phase ثم خطط React 19 منفصلًا | High للmajor |
| react-dom | ^18.3.1 | 18.3.1 | لا | يجب أن يطابق React | ترقية متزامنة مع React فقط | High للmajor |
| react-router-dom | ^7.1.1 | 7.1.1 | لا | الكود يستخدم APIs توافقية؛ routing داخلي غير مستفاد منه | لا upgrade قبل deep-link tests؛ راجع migration notes للإصدار الهدف | Medium |
| firebase | ^11.1.0 | 11.1.0 | لا | Auth/Firestore critical؛ Rules أهم من SDK version | upgrade patch/minor تدريجيًا بعد emulator tests؛ major منفصل | Medium/High |
| react-scripts | 5.0.1 | 5.0.1 | المنظومة CRA deprecated/long-term stasis | dependency tree قديم وكبير؛ 21 deprecations في lock | لا `audit fix --force`; ثبّت baseline ثم خطط migration إلى toolchain مدعوم | High |
| cra-template | 1.2.0 | 1.2.0 | template قديم/غير مطلوب runtime | unnecessary production dependency | أزل لاحقًا بعد إثبات أنه غير مستخدم | Low |
| tailwindcss | ^3.4.17 | 3.4.17 | لا | build-time؛ major 4 له تغييرات config | patch ضمن v3 أولًا، ثم migration منفصل إن لزم | High للmajor |
| @tailwindcss/forms | ^0.5.10 | 0.5.10 | لا | build plugin | حدّث مع Tailwind compatible matrix | Medium |
| postcss | ^8.4.49 | 8.4.49 | لا | parser/build surface | patch update بعد lock repair/build snapshot | Low/Medium |
| autoprefixer | ^10.4.20 | 10.4.20 | لا | build-time | patch update متزامن مع PostCSS | Low |
| @heroicons/react | ^2.2.0 | 2.2.0 | لا | UI only | patch/minor عادي بعد tests | Low |
| react-icons | ^5.4.0 | 5.4.0 | لا | UI bundle size | patch/minor؛ راقب tree-shaking | Low |
| web-vitals | ^4.2.4 | 4.2.4 | لا | `reportWebVitals()` بلا consumer | إما توصيله أو إزالته لاحقًا | Low |
| express | ^4.21.2 | **ليس direct-locked** | لا للإصدار المعلن | server framework؛ lock drift | أصلح lock أولًا؛ اختبر 4.x patch، وخطط Express 5 منفصلًا | High للmajor |
| multer | ^1.4.5-lts.1 | **غير موجود** | 1.x legacy | **عدة High DoS advisories**؛ endpoint بلا auth/rate limit يزيد الأثر | الانتقال إلى >=2.2.0 في branch/checkpoint منفصل مع API regression وlimits | High |
| cors | ^2.8.5 | **غير موجود** | لا | package بسيط لكن policy الحالية permissive | lock exact resolution؛ أصلح policy في code phase | Low package / High config |
| concurrently | ^9.1.2 | **غير موجود** | لا | dev orchestration؛ `-k` يجعل API port failure يوقف web | lock وإضافة startup preflight لاحقًا | Low/Medium |
| @babel/plugin-proposal-private-property-in-object | ^7.21.11 | placeholder transitive فقط؛ ليس direct-locked | proposal plugin deprecated | workaround مرتبط بـCRA؛ يزيد debt | لا تحدّث منفردًا؛ يختفي مع toolchain migration | Medium |

## Multer Security Detail

الإصدار المعلن `1.4.5-lts.1` يقع ضمن النطاق المتأثر في advisories الرسمية التالية على الأقل:

- [GHSA-4pg4-qvpc-4q3h](https://github.com/expressjs/multer/security/advisories/GHSA-4pg4-qvpc-4q3h): malformed multipart DoS، affected `>=1.4.4-lts.1,<2.0.0`.
- [GHSA-fjgf-rc76-4x9p](https://github.com/expressjs/multer/security/advisories/GHSA-fjgf-rc76-4x9p): malformed request/unhandled exception، patched 2.0.2.
- [GHSA-5528-5vmv-3xc2](https://github.com/expressjs/multer/security/advisories/GHSA-5528-5vmv-3xc2): uncontrolled recursion، affected `<2.1.1`.
- [GHSA-72gw-mp4g-v24j](https://github.com/expressjs/multer/security/advisories/GHSA-72gw-mp4g-v24j): deeply nested field names DoS، patched 2.2.0 مع توصية `limits.fieldNestingDepth`.
- [GHSA-3p4h-7m6x-2hcm](https://github.com/expressjs/multer/security/advisories/GHSA-3p4h-7m6x-2hcm): incomplete cleanup of aborted uploads.

لأن File API public بلا auth/rate limit، قابلية الاستغلال network-adjacent/remote أعلى من مشروع development محلي مغلق. مجرد تغيير version غير كافٍ؛ يلزم auth, rate limit, field/parts limits, abort cleanup test, disk quota.

## Create React App Risk

- [المستودع الرسمي لـCreate React App](https://github.com/facebook/create-react-app) يصف المشروع بأنه deprecated وفي long-term stasis.
- `react-scripts` 5.0.1 هو آخر خط موجود في lock الحالي، لكن بقاؤه يجمد Webpack/Jest/ESLint/Babel tree.
- migration مباشرة أثناء security fixes سترفع مخاطر regression؛ الأفضل إصلاح lock وبناء baseline أولًا، ثم toolchain migration phase مستقلة.

## Deprecated Transitive Packages in Current Lock

تم العثور على 21 lock entry تحمل `deprecated` metadata، تشمل:

- Babel proposal plugins: class-properties, nullish-coalescing, numeric-separator, optional-chaining, private-methods.
- `@humanwhocodes/config-array`, `@humanwhocodes/object-schema`.
- `eslint@8.57.1` unsupported.
- `glob@7`, `rimraf@3`, `svgo@1`, `inflight` (memory leak warning).
- `rollup-plugin-terser`, `sourcemap-codec`, `abab`, `domexception`, `q`, `stable`.
- Workbox entries عليها maintenance/compatibility warnings.

هذه في معظمها ناتجة من CRA tree؛ إصلاحها package-by-package قد يكسر react-scripts. يجب علاجها عبر toolchain migration مدروسة، لا `npm audit fix --force`.

## Reproducibility Risks

1. `package.json` وlock غير متزامنين.
2. carets في dependencies تعني أن `npm install` قد يعيد حل نسخ أحدث عند إصلاح lock.
3. لا `engines` لـNode/npm.
4. batch يستخدم `npm install` تلقائيًا، فيمكن أن يغير lock قبل أن يعرف المستخدم.
5. لا CI أو clean-install build record.
6. لا SBOM أو dependency snapshot موثق.

## Safe Upgrade Plan — بلا تنفيذ

1. بعد موافقة المستخدم: أنشئ checkpoint ZIP محلي pre-dependency وفق naming policy، بعد تحديد شروطه؛ لا PASS ما لم تتحقق المعايير.
2. وثّق Node LTS/npm versions وأضف لاحقًا `engines`/`.nvmrc` أو بديل Windows مناسب.
3. في نسخة عمل منفصلة: ولّد lock متزامنًا عبر install واحد موثق، دون `audit fix`.
4. نفذ clean `npm ci`, build, unit tests, smoke لكل role، ثم online `npm audit` واحفظ التقرير.
5. ارفع Multer إلى خط patched (>=2.2.0 بحسب advisory الأحدث المدقق) وعدّل limits؛ اختبر upload compatibility وDoS cases.
6. حدّث patch/minor المباشرة على دفعات صغيرة مع build/smoke بعد كل دفعة.
7. انقل CRA إلى toolchain مدعوم في Phase مستقلة، مع route/env/Tailwind/test migration.
8. لا تستخدم `npm audit fix --force`; عالج كل advisory حسب dependency path وbreaking risk.

## Acceptance Criteria for Dependency Phase

- `package.json` وlock متزامنان؛ `npm ci` لا يغير ملفات tracked ولا يفشل.
- build production ناجح بلا high-risk warnings غير موثقة.
- test suite حديثة ناجحة؛ اختبار CRA الافتراضي مستبدل.
- online audit محفوظ مع تفسير accepted risks، وصفر Critical/High exploitable في runtime أو waiver موثق وموافق عليه.
- Multer malformed/aborted/nested multipart tests ناجحة.
- startup على occupied 5050 يعطي رسالة واضحة ولا يترك processes قديمة.
- no source/business behavior regression في Lecturer/Recruiter/Admin/Super/Limited flows.
