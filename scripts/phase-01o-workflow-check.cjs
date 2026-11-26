const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const valueAfter = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
};
const requireFile = (name, value) => {
  if (!value) throw new Error(`${name}_MISSING`);
  const resolved = path.resolve(value);
  if (!fs.statSync(resolved).isFile()) throw new Error(`${name}_INVALID`);
  return resolved;
};

const credentialPath = requireFile('CREDENTIAL', valueAfter('--credential'));
const recruiterPath = requireFile('RECRUITER_FILE', valueAfter('--recruiter-file'));
const lecturerPath = requireFile('LECTURER_FILE', valueAfter('--lecturer-file'));
const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
const recruiterData = JSON.parse(fs.readFileSync(recruiterPath, 'utf8'));
const lecturerData = JSON.parse(fs.readFileSync(lecturerPath, 'utf8'));
const projectId = 'my-project-51bb7';
if (serviceAccount.project_id !== projectId || recruiterData.projectId !== projectId || lecturerData.projectId !== projectId) {
  throw new Error('PROJECT_MISMATCH');
}

const app = initializeApp({ credential: cert(serviceAccount), projectId }, `phase-01o-check-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const jobTitle = 'محاضر غير متفرغ — نظم قواعد البيانات — JOB-01';
const active = data => ['active', undefined, null, ''].includes(data?.accountStatus) && !['blocked', 'suspended'].includes(data?.status);
const hasSensitiveKey = value => /password|token|private[_-]?key|secret/i.test(JSON.stringify(value || {}));

const main = async () => {
  const recruiterEmail = String(recruiterData.recruiter01?.email || '').trim().toLowerCase();
  const lecturerEmail = String(lecturerData.lecturer01?.email || '').trim().toLowerCase();
  const [recruiterAuth, lecturerAuth] = await Promise.all([
    auth.getUserByEmail(recruiterEmail), auth.getUserByEmail(lecturerEmail)
  ]);
  const [recruiterSnap, lecturerSnap] = await Promise.all([
    db.collection('users').doc(recruiterAuth.uid).get(), db.collection('users').doc(lecturerAuth.uid).get()
  ]);
  const recruiter = recruiterSnap.data() || {};
  const lecturer = lecturerSnap.data() || {};

  const positions = await db.collection('positions').where('title', '==', jobTitle).get();
  const job = positions.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.postedBy?.id === recruiterAuth.uid);
  const applicationSnap = job
    ? await db.collection('applications').where('positionId', '==', job.id).get()
    : { docs: [] };
  const application = applicationSnap.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.applicantId === lecturerAuth.uid && item.recruiterId === recruiterAuth.uid);

  const allDocuments = await db.collection('documents').get();
  const lecturerDocuments = allDocuments.docs.map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.userId === lecturerAuth.uid);
  const relatedDocuments = lecturerDocuments.filter(item =>
    item.recruiterId === recruiterAuth.uid
    && (!item.applicationId || item.applicationId === application?.id)
    && (!item.positionId || item.positionId === job?.id)
  );
  const allNotifications = await db.collection('notifications').get();
  const relatedNotifications = allNotifications.docs.map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.applicationId === application?.id || item.positionId === job?.id || relatedDocuments.some(docItem => docItem.id === item.documentId));

  const output = {
    projectId,
    accounts: {
      recruiterActive: !recruiterAuth.disabled && recruiter.role === 'recruiter' && active(recruiter),
      lecturerActive: !lecturerAuth.disabled && lecturer.role === 'lecturer' && active(lecturer)
    },
    job: {
      exists: Boolean(job),
      matchingCount: positions.docs.filter(item => item.data().postedBy?.id === recruiterAuth.uid).length,
      status: job?.status || null,
      ownerCorrect: job?.postedBy?.id === recruiterAuth.uid
    },
    application: {
      exists: Boolean(application),
      status: application?.status || null,
      ownershipCorrect: Boolean(application && application.applicantId === lecturerAuth.uid && application.recruiterId === recruiterAuth.uid)
    },
    cv: {
      referencePresent: Boolean(lecturer.cvUrl),
      storagePathPresent: Boolean(lecturer.cvStoragePath),
      metadataNoSensitiveKeys: !hasSensitiveKey({ cvUrl: lecturer.cvUrl, cvStoragePath: lecturer.cvStoragePath })
    },
    documents: {
      total: allDocuments.size,
      lecturerTotal: lecturerDocuments.length,
      relatedTotal: relatedDocuments.length,
      items: relatedDocuments.map(item => ({
        id: item.id,
        title: item.title || null,
        type: item.type || null,
        status: item.status || null,
        recruiterCorrect: item.recruiterId === recruiterAuth.uid,
        applicationCorrect: !item.applicationId || item.applicationId === application?.id,
        positionCorrect: !item.positionId || item.positionId === job?.id,
        fileReferencePresent: Boolean(item.storagePath || item.fileURL),
        reviewedByPresent: Boolean(item.reviewedBy || item.reviewerId),
        reviewedAtPresent: Boolean(item.reviewedAt),
        notePresent: Boolean(item.reviewerComments || item.reviewNote),
        noSensitiveKeys: !hasSensitiveKey(item)
      }))
    },
    notifications: {
      totalRelated: relatedNotifications.length,
      byType: relatedNotifications.reduce((counts, item) => {
        counts[item.type || 'unknown'] = (counts[item.type || 'unknown'] || 0) + 1;
        return counts;
      }, {}),
      items: relatedNotifications.map(item => ({
        type: item.type || null,
        recipientRole: item.receiver?.id === recruiterAuth.uid ? 'recruiter' : item.receiver?.id === lecturerAuth.uid ? 'lecturer' : 'other',
        read: item.read === true,
        readAtPresent: Boolean(item.readAt),
        status: item.status || null,
        documentTargetPresent: Boolean(item.documentId),
        applicationTargetPresent: Boolean(item.applicationId),
        deepLinkPresent: Boolean(item.deepLink),
        eventKeyPresent: Boolean(item.eventKey),
        noSensitiveKeys: !hasSensitiveKey(item)
      }))
    }
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
};

main().catch(error => {
  process.stderr.write(`${error?.code || error?.message || 'PHASE_01O_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
