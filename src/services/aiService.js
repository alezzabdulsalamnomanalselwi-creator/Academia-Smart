const cleanText = value => String(value || '').trim();
const normalized = value => cleanText(value).toLocaleLowerCase('ar').replace(/[ـًٌٍَُِّْ]/g, '').replace(/[^\p{L}\p{N}+#.]+/gu, ' ').trim();
const meaningful = value => {
  const result = normalized(value);
  return Boolean(result) && !['not specified', 'غير محدد', 'undefined', 'unknown'].includes(result);
};
const tokenSet = value => new Set(normalized(value).split(/\s+/).filter(token => token.length > 1));
const overlapRatio = (left, right) => {
  const a = tokenSet(left); const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let matches = 0;
  a.forEach(token => { if (b.has(token)) matches += 1; });
  return matches / Math.max(a.size, b.size);
};
const exactOrContained = (needle, haystack) => {
  const left = normalized(needle); const right = normalized(haystack);
  return Boolean(left && right && (left === right || right.includes(left) || left.includes(right)));
};
const asList = value => Array.isArray(value) ? value.map(cleanText).filter(Boolean) : cleanText(value).split(/[,،;|]/).map(item => item.trim()).filter(Boolean);
const unique = values => [...new Set(values.map(cleanText).filter(Boolean))];
const numericRatingValue = candidate => {
  const raw = candidate.averageRating ?? candidate.ratingAverage;
  if (raw === null || raw === undefined || cleanText(raw) === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
};
const candidateCorpus = candidate => [
  candidate.education, candidate.experience, candidate.yearsExperience, candidate.department,
  candidate.currentInstitution, ...(candidate.skills || []),
  ...(candidate.teachingExperience || []).flatMap(item => [item.course, item.subject, item.department, item.description])
].filter(Boolean).join(' ');
const extractYears = candidate => {
  const direct = Number(candidate.yearsExperience ?? candidate.experienceYears);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const match = cleanText(candidate.experience).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};
const qualificationScore = education => {
  const value = normalized(education);
  if (!meaningful(value)) return 0;
  if (/phd|doctor|دكتور/.test(value)) return 15;
  if (/master|ماجستير/.test(value)) return 13;
  if (/bachelor|بكالوريوس/.test(value)) return 9;
  return 6;
};
const requiredSkills = job => {
  const explicit = asList(job.requiredSkills || job.skillsRequired || []);
  const subject = meaningful(job.subject) ? [cleanText(job.subject)] : [];
  const requirements = normalized(job.requirements);
  const taxonomy = [
    ['SQL', /\bsql\b|لغة الاستعلام/],
    ['تصميم قواعد البيانات', /database design|تصميم قواعد البيانات/],
    ['إدارة قواعد البيانات', /database administration|إدارة قواعد البيانات/],
    ['تحليل البيانات', /data analysis|تحليل البيانات/],
    ['Python', /\bpython\b|بايثون/],
    ['البحث العلمي', /research|البحث العلمي/],
    ['التدريس الجامعي', /teaching|التدريس/]
  ];
  return unique([...explicit, ...subject, ...taxonomy.filter(([, pattern]) => pattern.test(requirements)).map(([label]) => label)]);
};
const skillPresent = (skill, candidate) => {
  const corpus = candidateCorpus(candidate);
  if (exactOrContained(skill, corpus)) return true;
  return overlapRatio(skill, corpus) >= 0.5;
};

export const analyzeCandidateLocal = (candidate = {}) => {
  const job = {
    title: candidate.jobTitle || candidate.position || '',
    department: candidate.jobDepartment || candidate.department || '',
    subject: candidate.subject || '',
    requirements: candidate.requirements || '',
    requiredSkills: candidate.requiredSkills || candidate.skillsRequired || []
  };
  const teachingCorpus = (candidate.teachingExperience || []).map(item => `${item.course || ''} ${item.subject || ''} ${item.department || ''}`).join(' ');
  const candidateDepartment = candidate.candidateDepartment || candidate.profileDepartment || candidate.department || '';
  const subjectMatch = exactOrContained(job.subject, teachingCorpus) ? 25 : Math.round(overlapRatio(job.subject, teachingCorpus) * 15);
  const departmentMatch = exactOrContained(job.department, candidateDepartment) ? 15 : Math.round(overlapRatio(job.department, candidateDepartment) * 8);
  const qualification = qualificationScore(candidate.education);
  const wantedSkills = requiredSkills(job);
  const matchedSkills = wantedSkills.filter(skill => skillPresent(skill, candidate));
  const missingSkills = wantedSkills.filter(skill => !skillPresent(skill, candidate));
  const skillScore = wantedSkills.length ? Math.round((matchedSkills.length / wantedSkills.length) * 20) : 0;
  const years = extractYears(candidate);
  const experience = years >= 5 ? 10 : years >= 3 ? 8 : years >= 1 ? 5 : (candidate.teachingExperience || []).length ? 4 : 0;
  const completenessChecks = [candidate.education, candidateDepartment, candidate.skills?.length, candidate.teachingExperience?.length, candidate.cvUrl, candidate.experience || candidate.yearsExperience];
  const profileCompleteness = Math.round((completenessChecks.filter(Boolean).length / completenessChecks.length) * 100);
  const completeness = Math.round(profileCompleteness / 10);
  const evidence = (meaningful(candidate.cvUrl) ? 2 : 0) + (meaningful(candidate.certificatesUrl) ? 1 : 0);
  const numericRating = numericRatingValue(candidate);
  const rating = numericRating === null ? 0 : Math.round((numericRating / 5) * 2);
  const breakdown = { subject: subjectMatch, department: departmentMatch, qualification, skills: skillScore, experience, completeness, evidence, rating };
  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)));
  const strengths = [];
  const gaps = [];
  if (subjectMatch >= 20) strengths.push(`خبرة تدريسية مرتبطة بالمادة: ${job.subject}.`);
  else if (meaningful(job.subject)) gaps.push(`لا يظهر في الملف دليل كافٍ على خبرة مباشرة في مادة ${job.subject}.`);
  if (departmentMatch >= 12) strengths.push(`القسم الأكاديمي متوافق مع ${job.department}.`);
  else if (meaningful(job.department)) gaps.push(`توافق القسم مع ${job.department} يحتاج مراجعة.`);
  if (qualification >= 13) strengths.push(`المؤهل الأكاديمي المتاح: ${cleanText(candidate.education)}.`);
  else if (!qualification) gaps.push('المؤهل الأكاديمي غير موضح في بيانات الملف المتاحة.');
  if (years > 0) strengths.push(`الخبرة المسجلة: ${years} سنوات.`);
  else gaps.push('عدد سنوات الخبرة غير موضح.');
  if (matchedSkills.length) strengths.push(`مهارات مطابقة: ${matchedSkills.join('، ')}.`);
  if (missingSkills.length) gaps.push(`مهارات مطلوبة غير ظاهرة في الملف: ${missingSkills.join('، ')}.`);
  if (!candidate.cvUrl) gaps.push('السيرة الذاتية غير متاحة ضمن البيانات المقدمة للتحليل.');
  const recommendation = score >= 75
    ? 'توافق مرتفع للمراجعة البشرية والمقارنة التفصيلية.'
    : score >= 50 ? 'توافق متوسط؛ راجع الفجوات والأدلة قبل أي قرار.'
      : 'توافق أولي منخفض؛ يلزم تحقق بشري إضافي من الملف.';
  const focus = missingSkills[0] || job.subject || job.department || 'متطلبات الوظيفة';
  const questions = unique([
    meaningful(job.subject) ? `صف خبرتك العملية أو التدريسية في ${job.subject} مع مثال موثق.` : '',
    `كيف ستعالج متطلبات ${focus} في هذا الدور؟`,
    meaningful(job.department) ? `كيف تربط أسلوبك التدريسي بأهداف قسم ${job.department}؟` : '',
    years > 0 ? `ما أبرز نتيجة حققتها خلال سنوات خبرتك الـ${years} ذات الصلة؟` : 'ما الخبرة الأقرب لهذه الوظيفة، وكيف يمكن التحقق منها؟',
    'ما خطة الدرس الأولى التي ستقدمها، وكيف ستقيس تعلم الطلبة؟'
  ]).slice(0, 5);
  return {
    score, breakdown, strengths, gaps, missingSkills, matchedSkills, recommendation, questions,
    profileCompleteness, source: 'local',
    disclaimer: 'التقييم الذكي أداة مساعدة ولا يمثل قرار التوظيف النهائي.'
  };
};

export const rankCandidatesLocal = candidates => [...(candidates || [])].map(candidate => ({
  candidate,
  analysis: analyzeCandidateLocal(candidate)
})).sort((left, right) => right.analysis.score - left.analysis.score
  || cleanText(left.candidate.id || left.candidate.name).localeCompare(cleanText(right.candidate.id || right.candidate.name)));

export const compareCandidatesLocal = candidates => rankCandidatesLocal(candidates).map(({ candidate, analysis }) => ({
  id: candidate.id,
  name: candidate.name,
  testFixture: candidate.testFixture === true,
  qualification: meaningful(candidate.education) ? cleanText(candidate.education) : 'غير متوفر',
  experience: extractYears(candidate),
  skills: asList(candidate.skills),
  averageRating: numericRatingValue(candidate),
  score: analysis.score,
  strengths: analysis.strengths,
  gaps: analysis.gaps,
  missingSkills: analysis.missingSkills,
  interviewFocus: analysis.questions.slice(0, 3)
}));

export const analyzeCandidateHybrid = async (candidate, timeoutMs = 9000) => {
  const localAnalysis = analyzeCandidateLocal(candidate);
  const endpoint = process.env.REACT_APP_AI_API_URL;
  if (!endpoint) return localAnalysis;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'candidate-analysis', application: candidate }), signal: controller.signal
    });
    if (!response.ok) throw new Error(`AI API ${response.status}`);
    const data = await response.json();
    if (!Number.isFinite(data?.score) || data.score < 0 || data.score > 100
      || !Array.isArray(data?.strengths) || !Array.isArray(data?.gaps)
      || !Array.isArray(data?.missingSkills) || !Array.isArray(data?.questions)) throw new Error('Invalid AI response');
    return {
      ...localAnalysis,
      strengths: data.strengths,
      gaps: data.gaps,
      missingSkills: data.missingSkills,
      questions: data.questions,
      recommendation: meaningful(data.recommendation) ? cleanText(data.recommendation) : localAnalysis.recommendation,
      source: 'cloud'
    };
  } catch (error) {
    console.warn('Cloud AI unavailable; using local fallback:', error.message);
    return localAnalysis;
  } finally { clearTimeout(timer); }
};

export const suggestDocumentReviewNoteLocal = (document = {}) => {
  const title = String(document.title || 'المستند').trim().slice(0, 120);
  const type = String(document.type || 'غير محدد').trim().slice(0, 80);
  const fileState = document.fileURL || document.storagePath ? 'الملف متاح للمراجعة' : 'مرجع الملف غير متاح';
  return { note: `اقتراح مراجعة: تمت مراجعة بيانات مستند «${title}» من نوع «${type}». ${fileState}. يُرجى التحقق البشري من وضوح الملف وصحته وارتباطه بالطلب قبل اتخاذ القرار النهائي.`, source: 'local' };
};

export const suggestDocumentReviewNoteHybrid = async (document, timeoutMs = 7000) => {
  const endpoint = process.env.REACT_APP_AI_API_URL;
  if (!endpoint) return suggestDocumentReviewNoteLocal(document);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'document-review-note', document: { title: document?.title || '', type: document?.type || '', fileName: document?.fileName || '', fileSize: document?.fileSize || null, status: document?.status || '' } }), signal: controller.signal });
    if (!response.ok) throw new Error(`AI API ${response.status}`);
    const data = await response.json();
    if (typeof data?.note !== 'string' || data.note.trim().length < 20) throw new Error('Invalid AI response');
    return { note: data.note.trim().slice(0, 1200), source: 'cloud' };
  } catch (error) {
    console.warn('Cloud document-note AI unavailable; using local fallback:', error.message);
    return suggestDocumentReviewNoteLocal(document);
  } finally { clearTimeout(timer); }
};
