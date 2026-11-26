const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const arg = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
};

const credentialPath = path.resolve(arg('--credential') || '');
const recruiterPath = path.resolve(arg('--recruiter-file') || '');
const lecturerPath = path.resolve(arg('--lecturer-file') || '');
if (!credentialPath || !recruiterPath || !lecturerPath) {
  throw new Error('REQUIRED_SAFE_INPUT_MISSING');
}

const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
const recruiterData = JSON.parse(fs.readFileSync(recruiterPath, 'utf8'));
const lecturerData = JSON.parse(fs.readFileSync(lecturerPath, 'utf8'));
const projectId = 'my-project-51bb7';
if (
  serviceAccount.project_id !== projectId
  || recruiterData.projectId !== projectId
  || lecturerData.projectId !== projectId
) {
  throw new Error('PROJECT_MISMATCH');
}

const app = initializeApp({ credential: cert(serviceAccount), projectId }, 'phase-01n-workflow-check');
const db = getFirestore(app);
const auth = getAuth(app);
const jobTitle = 'محاضر غير متفرغ — نظم قواعد البيانات — JOB-01';

const collectionCount = async name => (await db.collection(name).count().get()).data().count;
const active = profile => profile?.accountStatus === 'active' || profile?.status === 'active';
const hasSensitiveKey = value => /password|token|private[_-]?key|secret/i.test(JSON.stringify(value || {}));

const main = async () => {
  const recruiterEmail = String(recruiterData.recruiter01?.email || '').trim().toLowerCase();
  const lecturerEmail = String(lecturerData.lecturer01?.email || '').trim().toLowerCase();
  if (!recruiterEmail || !lecturerEmail) throw new Error('TEST_ACCOUNT_EMAIL_MISSING');

  const [recruiterAuth, lecturerAuth] = await Promise.all([
    auth.getUserByEmail(recruiterEmail),
    auth.getUserByEmail(lecturerEmail)
  ]);
  const [recruiterSnap, lecturerSnap] = await Promise.all([
    db.collection('users').doc(recruiterAuth.uid).get(),
    db.collection('users').doc(lecturerAuth.uid).get()
  ]);
  const recruiter = recruiterSnap.exists ? recruiterSnap.data() : {};
  const lecturer = lecturerSnap.exists ? lecturerSnap.data() : {};

  const positionsSnap = await db.collection('positions').where('title', '==', jobTitle).get();
  const matchingPositions = positionsSnap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.postedBy?.id === recruiterAuth.uid);
  const position = matchingPositions[0];

  let applicationDocs = [];
  if (position) {
    const appSnap = await db.collection('applications').where('positionId', '==', position.id).get();
    applicationDocs = appSnap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.applicantId === lecturerAuth.uid);
  }
  const application = applicationDocs[0];

  const [university, college, department, subject] = position ? await Promise.all([
    db.collection('universities').doc(position.universityId || '_missing').get(),
    db.collection('colleges').doc(position.collegeId || '_missing').get(),
    db.collection('departments').doc(position.departmentId || '_missing').get(),
    db.collection('subjects').doc(position.subjectId || '_missing').get()
  ]) : [null, null, null, null];

  const relevantNotifications = position ? (await db.collection('notifications')
    .where('positionId', '==', position.id).get()).docs.map(item => ({ id: item.id, ...item.data() })) : [];
  const newPositionNotifications = relevantNotifications.filter(item => item.type === 'new_position');
  const applicationNotifications = relevantNotifications.filter(item => item.type === 'application');
  const statusNotifications = relevantNotifications.filter(item => item.type === 'application_status');

  const result = {
    projectId,
    accounts: {
      recruiterExists: Boolean(recruiterAuth.uid) && recruiterSnap.exists,
      recruiterEnabledActive: recruiterAuth.disabled === false && recruiter.role === 'recruiter' && active(recruiter),
      lecturerExists: Boolean(lecturerAuth.uid) && lecturerSnap.exists,
      lecturerEnabledActive: lecturerAuth.disabled === false && lecturer.role === 'lecturer' && active(lecturer),
      recruiterUniversityLinked: typeof recruiter.universityId === 'string' && recruiter.universityId.length > 0,
      lecturerPrerequisites: {
        firstName: Boolean(lecturer.firstName),
        lastName: Boolean(lecturer.lastName),
        education: Boolean(lecturer.education),
        cvUrl: Boolean(lecturer.cvUrl),
        department: Boolean(lecturer.department),
        teachingExperience: Array.isArray(lecturer.teachingExperience) && lecturer.teachingExperience.length > 0
      },
      lecturerCvLooksValid: (() => {
        try {
          const url = new URL(String(lecturer.cvUrl || '').trim());
          return ['http:', 'https:'].includes(url.protocol) && /\.(pdf|doc|docx|jpg|jpeg|png)$/i.test(url.pathname);
        } catch (_) {
          return false;
        }
      })(),
      lecturerApplicationProfileReady: Boolean(
        lecturer.firstName && lecturer.lastName && lecturer.education && lecturer.cvUrl
        && lecturer.department && Array.isArray(lecturer.teachingExperience)
        && lecturer.teachingExperience.length > 0
      )
    },
    counts: {
      positions: await collectionCount('positions'),
      applications: await collectionCount('applications')
    },
    job: {
      id: position?.id || null,
      matchingCount: matchingPositions.length,
      exists: Boolean(position),
      ownerCorrect: Boolean(position && position.postedBy?.id === recruiterAuth.uid),
      status: position?.status || null,
      deadline: position?.deadline || null,
      academicRelationsValid: Boolean(
        university?.exists && college?.exists && department?.exists && subject?.exists
        && college.data().universityId === university.id
        && department.data().collegeId === college.id
        && subject.data().departmentId === department.id
      ),
      universityMatchesRecruiter: Boolean(position && position.universityId === recruiter.universityId)
    },
    application: {
      id: application?.id || null,
      matchingCount: applicationDocs.length,
      exists: Boolean(application),
      lecturerCorrect: Boolean(application && application.applicantId === lecturerAuth.uid),
      recruiterCorrect: Boolean(application && application.recruiterId === recruiterAuth.uid),
      positionCorrect: Boolean(application && application.positionId === position?.id),
      universityCorrect: Boolean(application && application.universityId === position?.universityId),
      status: application?.status || null,
      appliedDatePresent: Boolean(application?.appliedDate),
      submittedAtPresent: Boolean(application?.submittedAt),
      timelinePresent: Array.isArray(application?.timeline) && application.timeline.length > 0,
      noSensitiveKeys: !hasSensitiveKey(application)
    },
    notifications: {
      totalForJob: relevantNotifications.length,
      newPositionCount: newPositionNotifications.length,
      applicationCount: applicationNotifications.length,
      applicationStatusCount: statusNotifications.length,
      newPositionRecipientCorrect: newPositionNotifications.some(item => item.userId === lecturerAuth.uid && item.receiver?.id === lecturerAuth.uid),
      applicationRecipientCorrect: applicationNotifications.some(item => item.userId === recruiterAuth.uid && item.receiver?.id === recruiterAuth.uid),
      statusRecipientCorrect: statusNotifications.some(item => item.userId === lecturerAuth.uid && item.receiver?.id === lecturerAuth.uid),
      readStates: relevantNotifications.map(item => ({
        type: item.type,
        read: item.read === true,
        status: item.status || null
      })),
      readStateFieldsConsistent: relevantNotifications.every(item =>
        (item.read === true && item.status === 'read')
        || (item.read !== true && item.status === 'unread')
      ),
      eventKeysUnique: new Set(relevantNotifications.map(item => item.eventKey)).size === relevantNotifications.length,
      noSensitiveKeys: relevantNotifications.every(item => !hasSensitiveKey(item))
    }
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

main().catch(error => {
  process.stderr.write(`${error?.code || error?.message || 'PHASE_01N_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
