import {
  analyzeCandidateHybrid,
  analyzeCandidateLocal,
  compareCandidatesLocal,
  rankCandidatesLocal,
  suggestDocumentReviewNoteHybrid,
  suggestDocumentReviewNoteLocal
} from './aiService';
import { buildPhase1rCandidateDataset } from '../data/phase1rCandidateFixtures';

const job = {
  jobTitle: 'محاضر قواعد بيانات', jobDepartment: 'قسم تكنولوجيا المعلومات',
  subject: 'نظم قواعد البيانات', requirements: 'SQL، تصميم قواعد البيانات، التدريس الجامعي'
};
const strong = {
  ...job, id: 'candidate-a', name: 'Candidate A', education: 'دكتوراه في علوم الحاسوب',
  candidateDepartment: 'قسم تكنولوجيا المعلومات', yearsExperience: 7,
  skills: ['SQL', 'تصميم قواعد البيانات', 'التدريس الجامعي'],
  teachingExperience: [{ course: 'نظم قواعد البيانات', department: 'قسم تكنولوجيا المعلومات' }],
  cvUrl: 'https://local.test/cv.pdf', certificatesUrl: 'https://local.test/certificate.pdf', averageRating: 4
};
const partial = {
  ...job, id: 'candidate-b', name: 'Candidate B', education: 'بكالوريوس',
  candidateDepartment: 'قسم هندسة البرمجيات', yearsExperience: 1, skills: ['Python']
};

describe('AI candidate analysis, ranking, and compare', () => {
  const previousEndpoint = process.env.REACT_APP_AI_API_URL;
  afterEach(() => {
    if (previousEndpoint === undefined) delete process.env.REACT_APP_AI_API_URL;
    else process.env.REACT_APP_AI_API_URL = previousEndpoint;
    jest.restoreAllMocks();
  });

  test('scoring is deterministic, bounded, and includes traceable breakdown', () => {
    const first = analyzeCandidateLocal(strong);
    const second = analyzeCandidateLocal({ ...strong });
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(Object.values(first.breakdown).reduce((sum, value) => sum + value, 0)).toBe(first.score);
    expect(first.source).toBe('local');
    expect(first.disclaimer).toContain('لا يمثل قرار التوظيف النهائي');
  });

  test('missing data stays explicit and is not hallucinated', () => {
    const result = analyzeCandidateLocal({ ...job, id: 'empty', name: 'Empty' });
    expect(result.gaps.join(' ')).toMatch(/غير موضح|غير متاحة|لا يظهر/);
    expect(result.strengths.join(' ')).not.toMatch(/سنوات|دكتوراه|ماجستير/);
    expect(result.missingSkills.length).toBeGreaterThan(0);
  });

  test('ranking is stable and orders strongest score first without mutating input', () => {
    const candidates = [partial, strong];
    const before = JSON.stringify(candidates);
    const ranked = rankCandidatesLocal(candidates);
    expect(ranked[0].candidate.id).toBe('candidate-a');
    expect(rankCandidatesLocal(candidates).map(item => item.candidate.id)).toEqual(ranked.map(item => item.candidate.id));
    expect(JSON.stringify(candidates)).toBe(before);
  });

  test('compare exposes only supplied profile facts and derived analysis', () => {
    const compared = compareCandidatesLocal([strong, partial]);
    expect(compared).toHaveLength(2);
    expect(compared[0]).toEqual(expect.objectContaining({ id: 'candidate-a', qualification: strong.education, experience: 7 }));
    expect(compared[0].interviewFocus).toHaveLength(3);
    expect(compared[1].averageRating).toBeNull();
  });

  test('hybrid path uses local fallback when cloud is absent or invalid', async () => {
    delete process.env.REACT_APP_AI_API_URL;
    expect((await analyzeCandidateHybrid(strong)).source).toBe('local');
    process.env.REACT_APP_AI_API_URL = 'https://ai.invalid/candidate';
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ score: 999 }) });
    expect((await analyzeCandidateHybrid(strong, 20)).source).toBe('local');
  });

  test('cloud can enrich explanations but cannot replace deterministic score or breakdown', async () => {
    process.env.REACT_APP_AI_API_URL = 'https://ai.valid/candidate';
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({
      score: 1,
      strengths: ['شرح سحابي منضبط'],
      gaps: ['فجوة سحابية'],
      missingSkills: ['مهارة موثقة كناقصة'],
      questions: ['سؤال سحابي؟'],
      recommendation: 'توصية استشارية سحابية'
    }) });
    const local = analyzeCandidateLocal(strong);
    const hybrid = await analyzeCandidateHybrid(strong, 20);
    expect(hybrid.source).toBe('cloud');
    expect(hybrid.score).toBe(local.score);
    expect(hybrid.breakdown).toEqual(local.breakdown);
    expect(hybrid.strengths).toEqual(['شرح سحابي منضبط']);
  });

  test('null rating stays unavailable instead of becoming a zero-star fact', () => {
    expect(compareCandidatesLocal([{ ...partial, averageRating: null }])[0].averageRating).toBeNull();
  });

  test('analysis never mutates application business status', () => {
    const application = { ...strong, status: 'interview_scheduled' };
    analyzeCandidateLocal(application);
    expect(application.status).toBe('interview_scheduled');
  });

  test('minimum compare dataset adds only local TEST fixtures bound to the owned job', () => {
    const realApplication = { ...strong, status: 'interview_scheduled', testFixture: false };
    const dataset = buildPhase1rCandidateDataset([realApplication]);
    expect(dataset).toHaveLength(3);
    expect(dataset[0]).toBe(realApplication);
    expect(dataset.slice(1).every(item => item.testFixture && item.positionId === realApplication.positionId)).toBe(true);
    expect(dataset.slice(1).every(item => item.status === undefined)).toBe(true);
  });

  test('candidate dataset never adds fixtures when three real candidates already exist', () => {
    const dataset = buildPhase1rCandidateDataset([
      { ...strong, id: 'real-1' }, { ...partial, id: 'real-2' }, { ...partial, id: 'real-3' }
    ]);
    expect(dataset).toHaveLength(3);
    expect(dataset.some(item => item.testFixture)).toBe(false);
  });
});

describe('AI document review note', () => {
  const previousEndpoint = process.env.REACT_APP_AI_API_URL;
  afterEach(() => {
    if (previousEndpoint === undefined) delete process.env.REACT_APP_AI_API_URL;
    else process.env.REACT_APP_AI_API_URL = previousEndpoint;
    jest.restoreAllMocks();
  });

  test('local suggestion is advisory and uses only supplied metadata', () => {
    const result = suggestDocumentReviewNoteLocal({ title: 'Test Certificate', type: 'Certificate', storagePath: 'safe/test.pdf' });
    expect(result.source).toBe('local');
    expect(result.note).toContain('Test Certificate');
    expect(result.note).toContain('التحقق البشري');
    expect(result.note).not.toMatch(/مقبول|مرفوض/);
  });

  test('hybrid path uses local fallback when cloud is not configured', async () => {
    delete process.env.REACT_APP_AI_API_URL;
    const result = await suggestDocumentReviewNoteHybrid({ title: 'Local Test', type: 'Certificate' });
    expect(result.source).toBe('local');
  });

  test('hybrid path falls back locally when cloud fails', async () => {
    process.env.REACT_APP_AI_API_URL = 'https://ai.invalid/review';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    expect((await suggestDocumentReviewNoteHybrid({ title: 'Fallback Test', type: 'Certificate' }, 20)).source).toBe('local');
  });
});
