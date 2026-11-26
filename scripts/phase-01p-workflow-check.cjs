const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'my-project-51bb7';
const JOB_TITLE = 'محاضر غير متفرغ — نظم قواعد البيانات — JOB-01';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const readSensitiveJson = flag => {
  const filePath = path.resolve(valueAfter(flag));
  const required = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
  if (!filePath.includes(required) || !fs.statSync(filePath).isFile()) throw new Error(`${flag}_INVALID`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};
const active = data => data?.accountStatus === 'active' && !['blocked', 'suspended'].includes(data?.status);
const noSensitiveKeys = value => !/password|token|private[_-]?key|secret/i.test(JSON.stringify(value || {}));

(async () => {
  const serviceAccount = readSensitiveJson('--credential');
  const recruiterData = readSensitiveJson('--recruiter-file');
  const lecturerData = readSensitiveJson('--lecturer-file');
  if (serviceAccount.project_id !== PROJECT_ID || recruiterData.projectId !== PROJECT_ID || lecturerData.projectId !== PROJECT_ID) {
    throw new Error('PROJECT_MISMATCH');
  }
  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, `phase-01p-check-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [recruiterAuth, lecturerAuth] = await Promise.all([
    auth.getUserByEmail(recruiterData.recruiter01.email),
    auth.getUserByEmail(lecturerData.lecturer01.email)
  ]);
  const [recruiterSnap, lecturerSnap, positionsSnap] = await Promise.all([
    db.collection('users').doc(recruiterAuth.uid).get(),
    db.collection('users').doc(lecturerAuth.uid).get(),
    db.collection('positions').where('title', '==', JOB_TITLE).get()
  ]);
  const recruiter = recruiterSnap.data() || {};
  const lecturer = lecturerSnap.data() || {};
  const job = positionsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.postedBy?.id === recruiterAuth.uid);
  const applicationsSnap = job
    ? await db.collection('applications').where('positionId', '==', job.id).get()
    : { docs: [] };
  const application = applicationsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.applicantId === lecturerAuth.uid && item.recruiterId === recruiterAuth.uid);
  const [allInterviews, allDocuments, allNotifications] = await Promise.all([
    db.collection('interviews').get(), db.collection('documents').get(), db.collection('notifications').get()
  ]);
  const interviews = allInterviews.docs.map(item => ({ id: item.id, ...item.data() }));
  const relatedInterviews = interviews.filter(item => item.applicationId === application?.id);
  const approvedDocument = allDocuments.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.userId === lecturerAuth.uid && item.recruiterId === recruiterAuth.uid && item.status === 'approved');
  const interviewIds = new Set(relatedInterviews.map(item => item.id));
  const notifications = allNotifications.docs.map(item => ({ id: item.id, ...item.data() }))
    .filter(item => interviewIds.has(item.interviewId));

  process.stdout.write(`${JSON.stringify({
    projectId: PROJECT_ID,
    accounts: {
      recruiterActive: !recruiterAuth.disabled && recruiter.role === 'recruiter' && active(recruiter),
      lecturerActive: !lecturerAuth.disabled && lecturer.role === 'lecturer' && active(lecturer)
    },
    job: { exists: Boolean(job), unique: positionsSnap.size === 1, ownerCorrect: job?.postedBy?.id === recruiterAuth.uid, status: job?.status || null },
    application: {
      exists: Boolean(application), id: application?.id || null, status: application?.status || null,
      relationsCorrect: Boolean(application && application.applicantId === lecturerAuth.uid && application.recruiterId === recruiterAuth.uid && application.positionId === job?.id)
    },
    approvedDocumentPresent: Boolean(approvedDocument),
    interviews: {
      total: interviews.length, relatedCount: relatedInterviews.length,
      items: relatedInterviews.map(item => ({
        id: item.id, applicationCorrect: item.applicationId === application?.id,
        positionCorrect: item.positionId === job?.id, recruiterCorrect: item.recruiterId === recruiterAuth.uid,
        lecturerCorrect: item.candidateId === lecturerAuth.uid, status: item.status || null,
        datePresent: Boolean(item.date), timePresent: Boolean(item.time), scheduledAtPresent: Boolean(item.scheduledAt),
        type: item.type || null, locationPresent: Boolean(item.location), createdAtPresent: Boolean(item.createdAt),
        updatedAtPresent: Boolean(item.updatedAt), noSensitiveKeys: noSensitiveKeys(item)
      }))
    },
    notifications: {
      relatedCount: notifications.length,
      items: notifications.map(item => ({
        type: item.type || null, recipientCorrect: item.receiver?.id === lecturerAuth.uid || item.userId === lecturerAuth.uid,
        read: item.read === true, readAtPresent: Boolean(item.readAt), interviewTargetPresent: Boolean(item.interviewId),
        applicationTargetPresent: Boolean(item.applicationId), deepLinkPresent: Boolean(item.deepLink),
        eventKeyPresent: Boolean(item.eventKey), noSensitiveKeys: noSensitiveKeys(item)
      }))
    },
    productionWrites: 0
  }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'PHASE_01P_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
