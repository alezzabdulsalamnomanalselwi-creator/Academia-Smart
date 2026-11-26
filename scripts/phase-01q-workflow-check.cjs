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

(async () => {
  const serviceAccount = readSensitiveJson('--credential');
  const recruiterData = readSensitiveJson('--recruiter-file');
  const lecturerData = readSensitiveJson('--lecturer-file');
  if (serviceAccount.project_id !== PROJECT_ID || recruiterData.projectId !== PROJECT_ID || lecturerData.projectId !== PROJECT_ID) {
    throw new Error('PROJECT_MISMATCH');
  }
  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, `phase-01q-check-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const [recruiterAuth, lecturerAuth] = await Promise.all([
    auth.getUserByEmail(recruiterData.recruiter01.email),
    auth.getUserByEmail(lecturerData.lecturer01.email)
  ]);
  const [recruiterSnap, lecturerSnap, positionsSnap, ratingsSnap, notificationsSnap] = await Promise.all([
    db.collection('users').doc(recruiterAuth.uid).get(),
    db.collection('users').doc(lecturerAuth.uid).get(),
    db.collection('positions').where('title', '==', JOB_TITLE).get(),
    db.collection('ratings').get(),
    db.collection('notifications').get()
  ]);
  const recruiter = recruiterSnap.data() || {};
  const lecturer = lecturerSnap.data() || {};
  const job = positionsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.postedBy?.id === recruiterAuth.uid);
  const applicationSnap = job
    ? await db.collection('applications').where('positionId', '==', job.id).get()
    : { docs: [] };
  const application = applicationSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.applicantId === lecturerAuth.uid && item.recruiterId === recruiterAuth.uid);
  const interviewSnap = application
    ? await db.collection('interviews').where('applicationId', '==', application.id).get()
    : { docs: [] };
  const interview = interviewSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.candidateId === lecturerAuth.uid && item.recruiterId === recruiterAuth.uid);
  const ratings = ratingsSnap.docs.map(item => ({ id: item.id, ...item.data() }));
  const relatedRatings = ratings.filter(item => item.lecturerId === lecturerAuth.uid || item.recruiterId === recruiterAuth.uid);
  const notifications = notificationsSnap.docs.map(item => ({ id: item.id, ...item.data() }));
  const ratingNotifications = notifications.filter(item => ['rating_request', 'rating_received'].includes(item.type));

  process.stdout.write(`${JSON.stringify({
    projectId: PROJECT_ID,
    accounts: {
      recruiterActive: !recruiterAuth.disabled && recruiter.role === 'recruiter' && active(recruiter),
      lecturerActive: !lecturerAuth.disabled && lecturer.role === 'lecturer' && active(lecturer)
    },
    job: { exists: Boolean(job), id: job?.id || null, status: job?.status || null },
    application: { exists: Boolean(application), id: application?.id || null, status: application?.status || null },
    interview: { exists: Boolean(interview), id: interview?.id || null, status: interview?.status || null },
    ratings: {
      allCount: ratings.length,
      relatedCount: relatedRatings.length,
      items: relatedRatings.map(item => ({
        id: item.id,
        recruiterCorrect: item.recruiterId === recruiterAuth.uid,
        lecturerCorrect: item.lecturerId === lecturerAuth.uid,
        applicationCorrect: !item.applicationId || item.applicationId === application?.id,
        interviewCorrect: !item.interviewId || item.interviewId === interview?.id,
        score: item.score ?? item.rating ?? null,
        status: item.status || null,
        requestIdPresent: Boolean(item.requestId),
        createdAtPresent: Boolean(item.createdAt),
        updatedAtPresent: Boolean(item.updatedAt || item.ratedAt)
      }))
    },
    ratingNotifications: {
      allCount: ratingNotifications.length,
      relatedCount: ratingNotifications.filter(item =>
        [item.sender?.id, item.receiver?.id, item.userId].includes(recruiterAuth.uid)
        || [item.sender?.id, item.receiver?.id, item.userId].includes(lecturerAuth.uid)
      ).length,
      items: ratingNotifications.map(item => ({
        id: item.id,
        type: item.type,
        status: item.status || null,
        read: item.read === true,
        readAtPresent: Boolean(item.readAt),
        lecturerContext: item.lecturerId === lecturerAuth.uid || item.sender?.id === lecturerAuth.uid || item.receiver?.id === lecturerAuth.uid,
        recruiterContext: item.recruiterId === recruiterAuth.uid || item.sender?.id === recruiterAuth.uid || item.receiver?.id === recruiterAuth.uid,
        applicationCorrect: !item.applicationId || item.applicationId === application?.id,
        interviewCorrect: !item.interviewId || item.interviewId === interview?.id,
        targetPresent: Boolean(item.ratingId || item.requestId || item.relatedId),
        deepLinkPresent: Boolean(item.deepLink),
        eventKeyPresent: Boolean(item.eventKey)
      }))
    },
    productionWrites: 0
  }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'PHASE_01Q_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
