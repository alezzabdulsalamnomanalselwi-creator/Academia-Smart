import { ASSISTANT_KB, formatAssistantDate, getAssistantPageContext, getAssistantPageHint, getContextualQuickSuggestions, getLocalAssistantAnswer, missingProfileFields, profileCompleteness, resolveAssistantRole, safeAssistantEntity } from './assistantKnowledge';
import { assistantSessionKey, readAssistantMessages, writeAssistantMessages } from './assistantSession';

const recruiterApplication = { id: 'application-1', type: 'application', status: 'under_review', positionTitle: 'محاضر قواعد بيانات', education: 'ماجستير', yearsExperience: 4, skills: ['SQL', 'التدريس'], matchScore: 70, recruiterId: 'recruiter-1', recruiterNotes: 'internal-only' };
const lecturerProfile = { firstName: 'L', lastName: 'One', education: 'ماجستير', department: 'IT', skills: ['SQL'], teachingExperience: [], cvUrl: '' };
const recruiterInterview = { id: 'interview-1', type: 'interview', status: 'rescheduled', positionTitle: 'محاضر قواعد بيانات', date: '2026-12-16 11:30' };
const lecturerApplication = { id: 'application-1', type: 'application', status: 'under_review', positionTitle: 'محاضر قواعد بيانات' };

describe('Smart Assistant contextual local fallback', () => {
  test.each([
    ['admin', 'اشرح لي هذه الصفحة.', '/admin-dashboard', 'لوحة الإدارة'],
    ['limitedAdmin', 'ما هي صلاحياتي؟', '/admin-dashboard', 'عرض التقارير وعرض سجل العمليات فقط'],
    ['recruiter', 'كيف أنشر وظيفة؟', '/recruiter-dashboard?section=post-position', 'اختر الجامعة'],
    ['lecturer', 'ماذا أفعل الآن؟', '/lecturer-dashboard?section=profile', 'أكمل الحقول الناقصة']
  ])('returns a role- and page-grounded answer for %s', (role, question, url, expected) => {
    const [pathname, search = ''] = url.split('?');
    expect(getLocalAssistantAnswer({ text: question, role, pathname, search: search ? `?${search}` : '' }).a).toContain(expected);
  });

  test('knows the current page, query entity, and contextual suggestions', () => {
    const page = getAssistantPageContext('/recruiter-dashboard', '?section=applications&applicationId=application-1');
    expect(page).toEqual(expect.objectContaining({ key: 'applications', title: 'الطلبات', entity: { type: 'application', id: 'application-1' } }));
    expect(getContextualQuickSuggestions({ role: 'recruiter', page })).toEqual(expect.arrayContaining(['لخص حالة هذا المرشح', 'اشرح نسبة التوافق']));
    expect(getAssistantPageHint('/lecturer-dashboard', 'lecturer', '?section=profile')).toContain('الملف الشخصي');
  });

  test('recruiter application context explains supplied facts without inventing any', () => {
    const result = getLocalAssistantAnswer({ text: 'لخص حالة هذا المرشح', role: 'recruiter', pathname: '/recruiter-dashboard', context: { page: getAssistantPageContext('/recruiter-dashboard', '?section=applications'), entity: recruiterApplication } });
    expect(result.a).toContain('قيد المراجعة');
    expect(result.a).toContain('70%');
    expect(result.a).toContain('ماجستير');
    expect(result.a).not.toContain('internal-only');
  });

  test('lecturer cannot receive recruiter-only ranking or internal candidate fields', () => {
    const entity = safeAssistantEntity(recruiterApplication, 'lecturer');
    expect(entity.matchScore).toBeUndefined();
    expect(entity.skills).toBeUndefined();
    const result = getLocalAssistantAnswer({ text: 'اشرح نسبة التوافق والفجوات', role: 'lecturer', pathname: '/lecturer-dashboard', context: { entity } });
    expect(result.a).toContain('لا تظهر لهذا الدور');
    expect(result.a).not.toContain('70%');
    expect(result.a).not.toContain('internal-only');
  });

  test('Limited Admin remains confined to actual report/audit capabilities', () => {
    expect(resolveAssistantRole({ role: 'admin', adminLevel: 'limited', permissions: ['reports.view', 'audit.view'] })).toBe('limitedAdmin');
    const result = getLocalAssistantAnswer({ text: 'ما هي صلاحياتي؟', role: 'limitedAdmin', pathname: '/admin-dashboard' });
    expect(result.a).toContain('عرض التقارير');
    expect(result.a).not.toContain('إدارة الحسابات');
    expect(ASSISTANT_KB.limitedAdmin.map(item => item.q).join(' ')).not.toContain('إضافة حساب');
  });

  test('lecturer profile state is deterministic and exposes only missing own fields', () => {
    expect(profileCompleteness(lecturerProfile)).toBeGreaterThan(0);
    expect(missingProfileFields(lecturerProfile)).toEqual(expect.arrayContaining(['السيرة الذاتية', 'سنوات الخبرة', 'الخبرة التدريسية']));
    const result = getLocalAssistantAnswer({ text: 'ما البيانات الناقصة؟', role: 'lecturer', pathname: '/lecturer-dashboard', context: { profileCompleteness: profileCompleteness(lecturerProfile), missingProfileFields: missingProfileFields(lecturerProfile) } });
    expect(result.a).toContain('السيرة الذاتية');
    expect(result.a).not.toContain('مرشح');
  });

  test('missing entity data remains explicit rather than hallucinated', () => {
    const result = getLocalAssistantAnswer({ text: 'لخص حالة هذا الطلب', role: 'lecturer', pathname: '/lecturer-dashboard', context: { page: getAssistantPageContext('/lecturer-dashboard', '?section=applications') } });
    expect(result.a).toContain('لا يوجد عنصر محدد');
    expect(result.a).not.toMatch(/دكتوراه|سنوات خبرة|70%/);
  });

  test('troubleshooting advice is safe and role-neutral', () => {
    expect(getLocalAssistantAnswer({ text: 'ظهرت صلاحية مرفوضة', role: 'recruiter' }).a).toContain('لا تحاول تجاوز الصلاحيات');
    expect(getLocalAssistantAnswer({ text: 'فشل رفع ملف', role: 'lecturer' }).a).toContain('25MB');
  });

  test('routes the exact failed Recruiter interview question to interview status, never Match Score', () => {
    const result = getLocalAssistantAnswer({ text: 'ما حالة المقابلة؟', role: 'recruiter', pathname: '/recruiter-dashboard', search: '?section=interviews', context: { workflow: { interviews: [recruiterInterview] } } });
    expect(result.intent).toBe('interview-status');
    expect(result.a).toContain('أعيدت جدولتها');
    expect(result.a).toContain('—');
    expect(result.a).not.toContain('2026-12-16 11:30');
    expect(result.a).not.toContain('نسبة التوافق');
  });

  test.each([
    ['ماذا أفعل الآن؟', 'next', 'طلبك قيد المراجعة'],
    ['ما نسبة اكتمال ملفي؟', 'profile', 'اكتمال ملفك'],
    ['ما حالة طلبي؟', 'application-status', 'قيد المراجعة'],
    ['ما الخطوة التالية؟', 'next', 'طلبك قيد المراجعة']
  ])('routes the exact failed Lecturer question %s to its intent', (question, intent, expected) => {
    const result = getLocalAssistantAnswer({ text: question, role: 'lecturer', pathname: '/lecturer-dashboard', context: { workflow: { applications: [lecturerApplication] }, profileCompleteness: profileCompleteness(lecturerProfile), missingProfileFields: missingProfileFields(lecturerProfile) } });
    expect(result.intent).toBe(intent);
    expect(result.a).toContain(expected);
    expect(result.a).not.toContain('نسبة التوافق');
  });

  test('keeps an explicit compatibility question on the Match Score intent only', () => {
    const result = getLocalAssistantAnswer({ text: 'لماذا التوافق 70%؟', role: 'recruiter', pathname: '/recruiter-dashboard', context: { entity: recruiterApplication } });
    expect(result.intent).toBe('ai-explanation');
    expect(result.a).toContain('نسبة التوافق');
  });

  test('formats assistant dates for Arabic display without changing stored values', () => {
    expect(formatAssistantDate('2026-12-16T08:30:00.000Z', { timeZone: 'Asia/Amman' })).toContain('—');
    const result = getLocalAssistantAnswer({ text: 'ما حالة المقابلة؟', role: 'recruiter', pathname: '/recruiter-dashboard', context: { workflow: { interviews: [{ ...recruiterInterview, date: '2026-12-16T08:30:00.000Z' }] } } });
    expect(result.a).toContain('—');
    expect(result.a).not.toContain('2026-12-16T08:30:00.000Z');
  });

  test('gives one actionable recruiter dashboard recommendation from safe current state', () => {
    const result = getLocalAssistantAnswer({ text: 'ما الخطوة التالية؟', role: 'recruiter', pathname: '/recruiter-dashboard', context: { page: getAssistantPageContext('/recruiter-dashboard'), workflow: { documents: [{ id: 'doc-1', type: 'document', status: 'pending' }], applications: [{ ...recruiterApplication }], interviews: [], jobs: [] }, unreadCount: 3 } });
    expect(result.intent).toBe('next');
    expect(result.a).toContain('مستند');
    expect(result.a).not.toContain('إشعار');
  });
});

describe('Smart Assistant session isolation', () => {
  const store = new Map();
  const storage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
  test('uses UID-isolated histories and cannot leak messages after user switch/logout', () => {
    writeAssistantMessages('lecturer-1', [{ from: 'user', text: 'سجل المحاضر' }], storage);
    writeAssistantMessages('recruiter-1', [{ from: 'user', text: 'سجل مسؤول التوظيف' }], storage);
    expect(readAssistantMessages('lecturer-1', storage)[0].text).toBe('سجل المحاضر');
    expect(readAssistantMessages('recruiter-1', storage)[0].text).toBe('سجل مسؤول التوظيف');
    expect(readAssistantMessages('anonymous', storage)).toEqual([]);
    expect(assistantSessionKey('lecturer-1')).not.toBe(assistantSessionKey('recruiter-1'));
  });
});
