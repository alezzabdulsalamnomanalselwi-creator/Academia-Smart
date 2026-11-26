const baseJob = application => ({
  positionId: application.positionId,
  position: application.position,
  jobTitle: application.jobTitle,
  jobDepartment: application.jobDepartment || application.department,
  subject: application.subject,
  requirements: application.requirements,
  requiredSkills: application.requiredSkills || []
});

export const createPhase1rCandidateFixtures = application => {
  if (!application) return [];
  const job = baseJob(application);
  return [
    {
      ...job,
      id: `phase1r-test-lecturer02-${application.positionId}`,
      applicantId: 'phase1r-test-lecturer02',
      name: 'Lecturer02 TEST',
      education: 'ماجستير في تكنولوجيا المعلومات',
      candidateDepartment: job.jobDepartment,
      yearsExperience: 5,
      experience: '5 سنوات',
      skills: ['SQL', 'تصميم قواعد البيانات', 'التدريس الجامعي'],
      teachingExperience: [{
        course: application.subject || 'نظم قواعد البيانات',
        department: job.jobDepartment,
        description: 'خبرة تدريسية اصطناعية مخصصة لاختبار المقارنة.'
      }],
      cvUrl: 'local-test-fixture://phase1r/lecturer02-cv',
      certificatesUrl: 'local-test-fixture://phase1r/lecturer02-certificate',
      averageRating: 4.5,
      testFixture: true
    },
    {
      ...job,
      id: `phase1r-test-lecturer03-${application.positionId}`,
      applicantId: 'phase1r-test-lecturer03',
      name: 'Lecturer03 TEST',
      education: 'بكالوريوس في هندسة البرمجيات',
      candidateDepartment: 'قسم هندسة البرمجيات',
      yearsExperience: 2,
      experience: 'سنتان',
      skills: ['Python', 'تحليل البيانات'],
      teachingExperience: [{
        course: 'مقدمة في البرمجة',
        department: 'قسم هندسة البرمجيات',
        description: 'بيانات اصطناعية مخصصة لاختبار فجوات التوافق.'
      }],
      cvUrl: 'local-test-fixture://phase1r/lecturer03-cv',
      averageRating: null,
      testFixture: true
    }
  ];
};

export const buildPhase1rCandidateDataset = applications => {
  const realCandidates = Array.isArray(applications) ? applications : [];
  if (!realCandidates.length || realCandidates.length >= 3) return realCandidates;
  return [...realCandidates, ...createPhase1rCandidateFixtures(realCandidates[0])]
    .slice(0, Math.max(3, realCandidates.length));
};
