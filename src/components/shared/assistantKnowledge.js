const clean = value => String(value || '').trim();
const normalise = value => clean(value).toLocaleLowerCase('ar').replace(/[ـًٌٍَُِّْ]/g, '');
const hasAny = (text, values) => values.some(value => normalise(text).includes(normalise(value)));

export const ASSISTANT_KB = {
  common: [{ q: 'ماذا أفعل الآن؟', a: 'سأحدد لك الخطوة التالية من الصفحة الحالية وحالة بياناتك المسموح بها.' }, { q: 'اشرح لي هذه الصفحة.', a: 'أشرح وظيفة الصفحة الحالية والخطوات الآمنة المتاحة لك.' }, { q: 'هل لدي إشعارات جديدة؟', a: 'أراجع عداد إشعاراتك ضمن جلستك الحالية فقط.' }],
  recruiter: [{ q: 'لخص حالة هذا المرشح', a: 'ألخص فقط بيانات المرشح والطلب المصرح لك بمراجعته.' }, { q: 'ما الخطوة التالية؟', a: 'أقترح خطوة workflow واضحة من دون تنفيذ أي إجراء.' }, { q: 'اشرح نسبة التوافق', a: 'أشرح المؤشرات والفجوات؛ النسبة أداة مساعدة وليست قرار توظيف.' }],
  lecturer: [{ q: 'ما نسبة اكتمال ملفي؟', a: 'أحسب اكتمال ملفك من حقولك المصرح بها فقط.' }, { q: 'ما البيانات الناقصة؟', a: 'أوضح الحقول الناقصة في ملفك دون كشف بيانات أي مستخدم آخر.' }, { q: 'ما الخطوة التالية؟', a: 'أقترح خطوة مناسبة لحالة طلبك أو مستندك.' }],
  admin: [{ q: 'اشرح لي هذه الصفحة.', a: 'أشرح أدوات الإدارة والسياق الأكاديمي أو التشغيلي الظاهر لك.' }, { q: 'أين أجد سجل العمليات؟', a: 'ستجد سجل العمليات ضمن لوحة الإدارة.' }, { q: 'ما الخطوة التالية؟', a: 'أقترح مراجعة آمنة بحسب الصفحة، من دون تنفيذ تغيير.' }],
  limitedAdmin: [{ q: 'ما هي صلاحياتي؟', a: 'أشرح الصلاحيات الفعلية للحساب ولا أقترح أي أدوات غير ممنوحة.' }, { q: 'كيف أفتح التقرير الأكاديمي؟', a: 'يمكنك فتح التقرير الأكاديمي وفق صلاحية العرض المتاحة.' }, { q: 'كيف أبحث في سجل العمليات؟', a: 'يمكنك مراجعة سجل العمليات وفق صلاحية العرض المتاحة.' }]
};

const PAGES = [
  ['/forgot-password', 'password', 'استعادة كلمة المرور', 'أنت في صفحة استعادة كلمة المرور. أرسل رابط الاستعادة ثم اتبع الرسالة الواردة إلى بريدك.'],
  ['/recruiter-dashboard', 'recruiter-dashboard', 'لوحة مسؤول التوظيف', 'أنت في لوحة مسؤول التوظيف. اختر الوظائف أو الطلبات أو المستندات أو المقابلات أو التقييمات.'],
  ['/lecturer-dashboard', 'lecturer-dashboard', 'لوحة المحاضر', 'أنت في لوحة المحاضر. يمكنك متابعة الوظائف والطلبات والمستندات والمقابلات وملفك الشخصي.'],
  ['/admin-dashboard', 'admin-dashboard', 'لوحة الإدارة', 'أنت في لوحة الإدارة. استخدم الأدوات الممنوحة لحسابك فقط.']
];
const SECTIONS = {
  applications: ['applications', 'الطلبات', 'هنا تستطيع مراجعة حالة الطلب والخطوة التالية دون تغييرها تلقائيًا.'],
  'track-applications': ['applications', 'طلباتي', 'هنا تتابع حالة طلباتك والمراحل التي مرّت بها.'],
  documents: ['documents', 'مراجعة المستندات', 'يمكنك فتح الملف ومراجعة بياناته واتخاذ القرار يدويًا.'],
  upload: ['documents', 'رفع المستندات', 'يمكنك رفع مستند مؤهل أو متابعة حالة المستندات المرسلة.'],
  interviews: ['interviews', 'المقابلات', 'راجع الموعد والحالة ومكان المقابلة أو رابطها قبل أي إجراء.'],
  ratings: ['ratings', 'التقييمات', 'التقييم أداة توثيق مهنية مرتبطة بالمسار، وليس قرارًا تلقائيًا.'],
  'post-position': ['jobs', 'نشر وظيفة', 'اختر التسلسل الأكاديمي وأكمل المتطلبات والموعد قبل النشر.'],
  'manage-positions': ['jobs', 'إدارة الوظائف المنشورة', 'يمكنك مراجعة الوظائف التي أنشأتها وحالتها وعدد المتقدمين.'],
  'view-positions': ['jobs', 'استعراض الوظائف', 'راجع تفاصيل الوظيفة ومتطلباتها قبل التقديم.'],
  profile: ['profile', 'الملف الشخصي', 'أنت في الملف الشخصي. أكمل البيانات الأكاديمية والخبرة والمهارات والسيرة الذاتية لتحسين اكتمال الملف.'],
  notifications: ['notifications', 'الإشعارات', 'يمكنك فتح الإشعار المرتبط ومتابعة القراءة من دون تغيير حالة أعمال أخرى.'],
  'view-lecturers': ['lecturers', 'استعراض المحاضرين', 'يمكنك استعراض الملفات المتاحة ضمن نطاق جامعتك وعلاقاتك المسموحة.']
};
const STATUSES = { pending: 'قيد الانتظار', under_review: 'قيد المراجعة', approved: 'معتمد', rejected: 'مرفوض', interview_scheduled: 'المقابلة مجدولة', scheduled: 'مجدولة', rescheduled: 'أعيدت جدولتها', completed: 'مكتملة', cancelled: 'ملغاة', no_show: 'عدم حضور', active: 'نشط', blocked: 'محظور', open: 'مفتوحة', closed: 'مغلقة' };
const EN_STATUSES = { pending: 'Pending', under_review: 'Under review', approved: 'Approved', rejected: 'Rejected', interview_scheduled: 'Interview scheduled', scheduled: 'Scheduled', rescheduled: 'Rescheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No show', active: 'Active', blocked: 'Blocked', open: 'Open', closed: 'Closed' };
const assistantStatus = (status, language = 'ar') => (language === 'ar' ? STATUSES : EN_STATUSES)[status] || status || (language === 'ar' ? 'غير محددة' : 'Not specified');

export const resolveAssistantRole = profile => profile?.role === 'admin' && profile?.adminLevel === 'limited' ? 'limitedAdmin' : ['admin', 'recruiter', 'lecturer'].includes(profile?.role) ? profile.role : 'common';
export const getAssistantPageContext = (pathname = '', search = '') => {
  const params = new URLSearchParams(search); const base = PAGES.find(([match]) => pathname.startsWith(match)) || ['', 'common', 'Academia Smart', 'أنا جاهز لشرح الصفحة الحالية والخطوة التالية المسموحة.'];
  const detail = SECTIONS[params.get('section') || ''];
  const found = ['applicationId', 'documentId', 'interviewId', 'ratingId', 'positionId', 'jobId'].map(key => ({ key, id: params.get(key) })).find(item => item.id);
  return { key: detail?.[0] || base[1], title: detail?.[1] || base[2], hint: detail?.[2] || base[3], section: params.get('section') || '', entity: found ? { type: found.key.replace('Id', ''), id: found.id } : null };
};
export const getAssistantPageHint = (pathname, role, search = '') => role === 'limitedAdmin' && pathname.startsWith('/admin-dashboard') ? 'أنت مدير محدود. المتاح لك هو التقرير الأكاديمي وسجل العمليات وفق الصلاحيات الفعلية فقط.' : getAssistantPageContext(pathname, search).hint;
export const profileCompleteness = profile => {
  if (!profile) return null;
  const fields = [profile.firstName, profile.lastName, profile.education, profile.phoneNumber, profile.department, profile.cvUrl, profile.yearsExperience || profile.experienceYears, Array.isArray(profile.skills) && profile.skills.length, Array.isArray(profile.teachingExperience) && profile.teachingExperience.length];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
};
export const missingProfileFields = profile => !profile ? [] : [['education', 'المؤهل الأكاديمي'], ['department', 'القسم أو التخصص'], ['cvUrl', 'السيرة الذاتية'], ['skills', 'المهارات'], ['yearsExperience', 'سنوات الخبرة'], ['teachingExperience', 'الخبرة التدريسية']].filter(([key]) => ['skills', 'teachingExperience'].includes(key) ? !Array.isArray(profile[key]) || !profile[key].length : !profile[key] && !(key === 'yearsExperience' && profile.experienceYears)).map(([, label]) => label);
export const formatAssistantDate = (value, options = {}) => {
  if (!value) return '';
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value;
  const date = raw instanceof Date ? raw : /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return clean(value);
  const locale = options.locale || 'ar-JO';
  const timeZone = options.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date);
  const timeLabel = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(date);
  return `${dateLabel} — ${timeLabel}`;
};
export const safeAssistantEntity = (entity, role) => {
  if (!entity) return null;
  const base = { type: entity.type, id: clean(entity.id).slice(0, 160), status: clean(entity.status), title: clean(entity.title || entity.positionTitle || entity.jobTitle).slice(0, 180), date: clean(entity.date || entity.scheduledAt || entity.interviewDate).slice(0, 80) };
  return role === 'recruiter' ? { ...base, education: clean(entity.education).slice(0, 180), yearsExperience: clean(entity.yearsExperience).slice(0, 30), skills: Array.isArray(entity.skills) ? entity.skills.map(item => clean(item).slice(0, 80)).slice(0, 12) : [], matchScore: Number.isFinite(Number(entity.matchScore)) ? Number(entity.matchScore) : null } : base;
};
export const getContextualQuickSuggestions = context => {
  const role = context?.role || 'common'; const page = context?.page?.key || 'common';
  if (context?.language === 'en') {
    if (role === 'limitedAdmin') return ['What are my permissions?', 'How do I open the academic report?', 'How do I search the audit log?'];
    if (role === 'recruiter' && page === 'applications') return ['Summarize this candidate', 'What is the next step?', 'Explain the match score', 'Which documents are available?'];
    if (role === 'recruiter' && page === 'interviews') return ['When is the interview?', 'What is the interview status?', 'What questions are suggested?'];
    if (role === 'lecturer' && page === 'profile') return ['What is my profile completeness?', 'Which details are missing?', 'How do I add experience?'];
    return ['What should I do next?', 'Explain this page.', 'Do I have new notifications?'];
  }
  if (role === 'limitedAdmin') return ['ما هي صلاحياتي؟', 'كيف أفتح التقرير الأكاديمي؟', 'كيف أبحث في سجل العمليات؟'];
  if (role === 'recruiter' && page === 'applications') return ['لخص حالة هذا المرشح', 'ما الخطوة التالية؟', 'اشرح نسبة التوافق', 'ما المستندات المتوفرة؟'];
  if (role === 'recruiter' && page === 'interviews') return ['ما موعد المقابلة؟', 'ما حالة المقابلة؟', 'ما الأسئلة المقترحة؟'];
  if (role === 'recruiter' && page === 'documents') return ['اشرح هذه الصفحة.', 'ما حالة المستند؟', 'ما الخطوة التالية؟'];
  if (role === 'lecturer' && page === 'profile') return ['ما نسبة اكتمال ملفي؟', 'ما البيانات الناقصة؟', 'كيف أضيف خبرة؟'];
  if (role === 'lecturer' && page === 'applications') return ['لخص حالة هذا الطلب', 'ما الخطوة التالية؟', 'ما معنى قيد المراجعة؟'];
  if (role === 'lecturer' && page === 'notifications') return ['هل لدي إشعارات جديدة؟', 'اشرح هذه الصفحة.', 'ما الخطوة التالية؟'];
  return [...ASSISTANT_KB.common, ...(ASSISTANT_KB[role] || [])].slice(0, 4).map(item => item.q);
};
export const getProactiveInsight = context => {
  if (Number(context?.unreadCount) > 0) return `لديك ${context.unreadCount} إشعار${context.unreadCount === 1 ? '' : 'ات'} غير مقروء${context.unreadCount === 1 ? '' : 'ة'}.`;
  if (context?.role === 'lecturer' && Number(context?.profileCompleteness) < 100) return `اكتمال ملفك الحالي ${context.profileCompleteness}%؛ يمكنك مراجعة الحقول الناقصة.`;
  if (context?.entity?.status) return `حالة العنصر الحالي: ${STATUSES[context.entity.status] || context.entity.status}.`;
  return '';
};
const entitySummary = context => {
  const entity = context?.entity; if (!entity) return 'لا يوجد عنصر محدد في الرابط الحالي؛ افتح الطلب أو المستند أو المقابلة ثم اسألني مجددًا.';
  const ar = context?.language !== 'en';
  const lines = [`${ar ? 'الحالة' : 'Status'}: ${assistantStatus(entity.status, context?.language)}`]; if (entity.title) lines.push(`${ar ? 'العنصر/الوظيفة' : 'Item / job'}: ${entity.title}`); if (entity.date) lines.push(`${ar ? 'الموعد/التاريخ' : 'Date / time'}: ${formatAssistantDate(entity.date, { locale: ar ? 'ar-JO' : 'en-US' })}`);
  if (context.role === 'recruiter' && entity.matchScore !== null && entity.matchScore !== undefined) lines.push(`نسبة التوافق: ${entity.matchScore}% (مؤشر مساعد فقط)`);
  if (context.role === 'recruiter' && entity.education) lines.push(`المؤهل: ${entity.education}`); if (context.role === 'recruiter' && entity.yearsExperience) lines.push(`الخبرة: ${entity.yearsExperience}`); if (context.role === 'recruiter' && entity.skills?.length) lines.push(`المهارات الظاهرة: ${entity.skills.join('، ')}`);
  return lines.join('\n');
};
const workflowRecords = (context, key) => Array.isArray(context?.workflow?.[key]) ? context.workflow[key] : [];
const oneOrManySummary = (records, label, context) => {
  if (!records.length) return `لا يوجد ${label} متاح ضمن السياق الحالي.`;
  if (records.length === 1) return entitySummary({ ...context, entity: records[0] });
  return `لديك ${records.length} ${label} ضمن السياق الحالي. الحالات: ${records.map(item => STATUSES[item.status] || item.status || 'غير محددة').join('، ')}. افتح العنصر المطلوب للحصول على ملخص تفصيلي.`;
};
const nextStep = context => {
  const { role, page, entity } = context || {};
  if (role === 'limitedAdmin') return 'راجع التقرير الأكاديمي أو سجل العمليات فقط؛ لا تملك صلاحية إدارة الحسابات أو تعديل الهيكل الأكاديمي.';
  if (role === 'recruiter' && page?.key === 'recruiter-dashboard' && !entity) {
    const documents = workflowRecords(context, 'documents');
    const interviews = workflowRecords(context, 'interviews');
    const applications = workflowRecords(context, 'applications');
    const jobs = workflowRecords(context, 'jobs');
    const pendingDocuments = documents.filter(item => ['pending', 'under_review'].includes(item.status)).length;
    const upcomingInterview = interviews.find(item => ['scheduled', 'rescheduled', 'interview_scheduled'].includes(item.status));
    const pendingApplication = applications.find(item => ['pending', 'under_review'].includes(item.status));
    if (pendingDocuments) return `لديك ${pendingDocuments} مستند${pendingDocuments === 1 ? '' : 'ات'} يحتاج مراجعة؛ ابدأ بالمستندات المعلقة أولًا.`;
    if (upcomingInterview) return 'لديك مقابلة قادمة؛ راجع الموعد ورابط الاجتماع أو المكان قبل موعدها.';
    if (pendingApplication) return 'لديك طلبات تحتاج مراجعة؛ افتح الطلبات وحدد أول حالة قيد الانتظار أو المراجعة.';
    if (Number(context.unreadCount) > 0) return `لديك ${context.unreadCount} إشعار${context.unreadCount === 1 ? '' : 'ات'} غير مقروء${context.unreadCount === 1 ? '' : 'ة'}؛ راجعها أولًا لمعرفة أي تحديث يحتاج متابعة.`;
    if (jobs.some(item => ['open', 'active', 'published'].includes(item.status))) return 'لا توجد مهام عاجلة حاليًا؛ راقب الطلبات الواردة على وظائفك المنشورة.';
    return 'لا توجد مهام عاجلة حاليًا. يمكنك مراجعة الوظائف المنشورة أو إنشاء وظيفة جديدة عند الحاجة.';
  }
  if (entity?.status === 'pending') return role === 'lecturer' ? 'تم إرسال الطلب. انتظر المراجعة وتابع الإشعارات، واستكمل المستندات فقط إذا طُلبت.' : 'راجع بيانات الطلب والمستندات ثم حدّث الحالة يدويًا عند اكتمال المراجعة.';
  if (entity?.status === 'under_review') return role === 'lecturer' ? 'طلبك قيد المراجعة. تابع الإشعارات واستكمل أي مستند يطلبه مسؤول التوظيف.' : 'راجع المستندات والمؤهلات والفجوات ثم سجّل قرار المراجعة يدويًا.';
  if (['interview_scheduled', 'scheduled', 'rescheduled'].includes(entity?.status)) return role === 'lecturer' ? 'راجع موعد المقابلة ومكانها أو رابطها واستعد لها، ثم تابع الإشعارات لأي تحديث.' : 'راجع الموعد والتفاصيل، ثم وثّق النتيجة يدويًا بعد إتمام المقابلة.';
  if (entity?.status === 'completed') return role === 'lecturer' ? 'راجع الإشعارات ونتيجة التقييم إن أصبحت متاحة.' : 'يمكنك متابعة طلب التقييم أو توثيق النتيجة وفق workflow الحالي.';
  if (page?.key === 'documents') return role === 'recruiter' ? 'افتح المستند، راجع بياناته، واستخدم ملاحظة المراجعة كاقتراح فقط ثم اتخذ القرار يدويًا.' : 'راجع حالة المستند أو ارفع مستندًا صالحًا وربطه بالطلب عند الحاجة.';
  if (page?.key === 'interviews') return ['scheduled', 'rescheduled'].includes(entity?.status) ? 'راجع الموعد والمكان أو رابط الاجتماع، ثم حدّث النتيجة يدويًا بعد المقابلة.' : 'اختر الطلب الصحيح ثم راجع الموعد قبل جدولته أو إعادة جدولته.';
  if (page?.key === 'applications') return role === 'recruiter' ? 'راجع المؤهلات والمستندات ونسبة التوافق، ثم حدّث الحالة يدويًا مع ملاحظة واضحة.' : 'تابع الحالة، واستكمل أي مستند أو طلب معلومات ظاهر لك.';
  if (page?.key === 'profile') return 'أكمل الحقول الناقصة ثم احفظ الملف؛ اكتمال الملف يحسن جودة التحليل لكنه لا يضمن قرارًا.';
  if (page?.key === 'jobs') return role === 'recruiter' ? 'تحقق من التسلسل الأكاديمي والمتطلبات والموعد قبل نشر الوظيفة.' : 'راجع المتطلبات والموعد ثم قدّم فقط إذا كان ملفك مكتملًا.';
  return 'ابدأ بالمهمة الأكثر صلة بالصفحة الحالية، ويمكنني شرح أي خطوة قبل تنفيذها.';
};
const troubleshooting = text => {
  if (hasAny(text, ['جلسة', 'session', 'منتهية'])) return 'تحقق من أن جلسة الدخول ما زالت فعالة ثم حدّث الصفحة وسجّل الدخول من جديد عند الحاجة.';
  if (hasAny(text, ['صلاحية', 'permission', 'غير مصرح'])) return 'لا تحاول تجاوز الصلاحيات. ارجع إلى الصفحة المسموحة لحسابك أو اطلب من المدير منح الصلاحية المناسبة إن كانت مطلوبة.';
  if (hasAny(text, ['رفع', 'upload', 'ملف'])) return 'تأكد من اختيار ملف مسموح وحجمه لا يتجاوز 25MB، ثم تحقق من اتصال خدمة الملفات المحلية.';
  if (hasAny(text, ['لا توجد', 'فارغ', 'empty'])) return 'لا توجد بيانات متاحة ضمن السياق الحالي. تحقق من الفلاتر أو أكمل الخطوة السابقة في workflow.';
  return '';
};
export const getLocalAssistantAnswer = ({ text, role = 'common', pathname = '', search = '', context = {} }) => {
  const page = context.page || getAssistantPageContext(pathname, search); const safeContext = { ...context, role, page, entity: safeAssistantEntity(context.entity || page.entity, role) }; const lower = normalise(text); const problem = troubleshooting(text);
  if (hasAny(lower, ['صلاحيات', 'مسموح', 'permission'])) return { a: role === 'limitedAdmin' ? 'صلاحياتك الحالية: عرض التقارير وعرض سجل العمليات فقط.' : role === 'admin' ? 'أنت مدير رئيسي؛ استخدم الصلاحيات بعناية، ولا ينفذ المساعد أي تغيير نيابة عنك.' : 'المساعد يشرح فقط البيانات والإجراءات المسموح بها لدورك الحالي ولا يوسع صلاحياتك.', intent: 'permissions' };
  if (hasAny(lower, ['حالة المقابلة', 'متى المقابلة', 'هل المقابلة', 'رابط المقابلة', 'موعد المقابلة'])) { const records=workflowRecords(safeContext,'interviews'); const entity=safeContext.entity?.type==='interview'?safeContext.entity:records.length===1?records[0]:null; return { a: `${safeContext.entity?.type==='interview'?entitySummary(safeContext):oneOrManySummary(records,'مقابلة',safeContext)}\n\n${entity?nextStep({...safeContext,entity}):records.length>1?'حدد المقابلة المطلوبة لعرض الموعد والخطوة التالية بدقة.':'افتح إدارة المقابلات أو راجع الموعد المتاح.'}`, intent: 'interview-status' }; }
  if (hasAny(lower, ['حالة طلبي', 'حالة الطلب', 'اين وصل طلبي', 'أين وصل طلبي', 'ماذا حدث لطلبي', 'المرحلة الحالية'])) { const records=workflowRecords(safeContext,'applications'); const entity=safeContext.entity?.type==='application'?safeContext.entity:records.length===1?records[0]:null; return { a: `${safeContext.entity?.type==='application'?entitySummary(safeContext):oneOrManySummary(records,'طلب',safeContext)}\n\n${entity?nextStep({...safeContext,entity}):records.length>1?'افتح الطلب المطلوب لعرض المرحلة والخطوة التالية بدقة.':'افتح صفحة متابعة الطلبات لمراجعة حالتك.'}`, intent: 'application-status' }; }
  if (hasAny(lower, ['ماذا افعل', 'ماذا أفعل', 'الخطوة التالية', 'التالي', 'بعد ذلك', 'المطلوب مني'])) return { a: nextStep({ ...safeContext, entity: safeContext.entity || workflowRecords(safeContext,'applications')[0] || workflowRecords(safeContext,'interviews')[0] }), intent: 'next' };
  if (role === 'lecturer' && hasAny(lower, ['اكتمال', 'مكتمل', 'بيانات ناقصة', 'ناقص'])) { const missing = safeContext.missingProfileFields || []; const percentage = safeContext.profileCompleteness; return { a: percentage === null || percentage === undefined ? 'تعذر حساب اكتمال الملف الآن.' : `اكتمال ملفك: ${percentage}%.${missing.length ? ` الحقول التي تحتاج مراجعة: ${missing.join('، ')}.` : ' لا تظهر حقول أساسية ناقصة.'}`, intent: 'profile' }; }
  if (hasAny(lower, ['حالة المستند', 'هل مستندي', 'المستند معتمد'])) return { a: `${entitySummary(safeContext)}\n\n${nextStep(safeContext)}`, intent: 'document-status' };
  if (hasAny(lower, ['حالة التقييم', 'نتيجة التقييم', 'rating'])) return { a: `${entitySummary(safeContext)}\n\n${nextStep(safeContext)}`, intent: 'rating-status' };
  if (hasAny(lower, ['اشعار', 'إشعار'])) return { a: Number.isFinite(Number(safeContext.unreadCount)) ? `لديك ${safeContext.unreadCount} إشعار${safeContext.unreadCount === 1 ? '' : 'ات'} غير مقروء${safeContext.unreadCount === 1 ? '' : 'ة'}.` : 'افتح صفحة الإشعارات لمراجعة الأحداث المرتبطة بحسابك.', intent: 'notifications' };
  if (hasAny(lower, ['نسبة التوافق', 'التوافق', 'المطابقة', 'نقاط القوة', 'الفجوات', 'match score'])) return { a: role === 'recruiter' ? `${entitySummary(safeContext)}\n\nنسبة التوافق والفجوات مؤشرات مساعدة للمراجعة البشرية وليست قرار قبول أو رفض تلقائي.` : 'نتائج الترتيب والملاحظات الداخلية لا تظهر لهذا الدور. يمكنك مراجعة الحالة والخطوة التالية الخاصة بطلبك.', intent: 'ai-explanation' };
  if (hasAny(lower, ['اشرح', 'هذه الصفحة', 'اين انا', 'أين أنا'])) return { a: `${page.hint}\n\nالصفحة الحالية: ${page.title}.`, intent: 'page' };
  if (problem) return { a: problem, intent: 'troubleshoot' };
  if (hasAny(lower, ['لخص', 'المرشح'])) return { a: entitySummary(safeContext), intent: 'entity-summary' };
  if (hasAny(lower, ['انشر', 'نشر وظيفة'])) return { a: role === 'recruiter' ? 'افتح «نشر وظيفة»، اختر الجامعة ثم الكلية ثم القسم ثم المادة، وأكمل المتطلبات والموعد قبل النشر.' : 'نشر الوظائف متاح لمسؤول التوظيف فقط.', intent: 'publish-job' };
  if (hasAny(lower, ['سجل العمليات', 'audit'])) return { a: role === 'admin' || role === 'limitedAdmin' ? 'افتح «سجل العمليات» من لوحة الإدارة. المدير المحدود يملك العرض فقط.' : 'سجل العمليات متاح للإدارة وفق الصلاحيات الممنوحة.', intent: 'audit' };
  return { a: `${page.hint}\n\nيمكنني مساعدتك في فهم الصفحة الحالية، الخطوة التالية، الحالة، الإشعارات، أو حل مشكلة شائعة.`, intent: 'fallback' };
};
