const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'my-project-51bb7';
const SUPER_EMAIL = 'admin@system.com';
const JOB_TITLE = 'محاضر غير متفرغ — نظم قواعد البيانات — JOB-01';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const readSensitive = flag => {
  const file = path.resolve(valueAfter(flag));
  const boundary = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
  if (!file.includes(boundary) || !fs.statSync(file).isFile()) throw new Error(`${flag}_INVALID`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const asRows = snapshot => snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
const activeProfile = profile => profile?.accountStatus === 'active' && !['blocked', 'suspended'].includes(profile?.status);
const key = (...parts) => parts.map(part => String(part || '')).join('|');
const duplicateCount = (rows, selector) => {
  const counts = new Map();
  rows.forEach(row => counts.set(selector(row), (counts.get(selector(row)) || 0) + 1));
  return [...counts.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);
};

(async () => {
  const serviceAccount = readSensitive('--credential');
  const limitedData = readSensitive('--limited-file');
  const recruiterData = readSensitive('--recruiter-file');
  const lecturerData = readSensitive('--lecturer-file');
  if (serviceAccount.project_id !== PROJECT_ID
    || recruiterData.projectId !== PROJECT_ID
    || lecturerData.projectId !== PROJECT_ID) throw new Error('PROJECT_MISMATCH');

  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, `phase-01s-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const emails = {
    superAdmin: SUPER_EMAIL,
    limitedAdmin: String(limitedData.email || '').toLowerCase(),
    recruiter: String(recruiterData.recruiter01?.email || '').toLowerCase(),
    lecturer: String(lecturerData.lecturer01?.email || '').toLowerCase()
  };
  const authEntries = await Promise.all(Object.entries(emails).map(async ([role, email]) => [role, await auth.getUserByEmail(email)]));
  const authUsers = Object.fromEntries(authEntries);

  const collectionNames = [
    'users', 'universities', 'colleges', 'departments', 'subjects', 'positions',
    'applications', 'documents', 'interviews', 'ratings', 'notifications', 'recruiterRequests'
  ];
  const snapshots = await Promise.all(collectionNames.map(name => db.collection(name).get()));
  const rows = Object.fromEntries(collectionNames.map((name, index) => [name, asRows(snapshots[index])]));
  const usersById = new Map(rows.users.map(item => [item.id, item]));
  const positionsById = new Map(rows.positions.map(item => [item.id, item]));
  const applicationsById = new Map(rows.applications.map(item => [item.id, item]));
  const interviewsById = new Map(rows.interviews.map(item => [item.id, item]));
  const universitiesById = new Map(rows.universities.map(item => [item.id, item]));
  const collegesById = new Map(rows.colleges.map(item => [item.id, item]));
  const departmentsById = new Map(rows.departments.map(item => [item.id, item]));

  const profiles = Object.fromEntries(Object.entries(authUsers).map(([role, user]) => [role, usersById.get(user.uid)]));
  const job = rows.positions.find(item => item.title === JOB_TITLE && item.postedBy?.id === authUsers.recruiter.uid);
  const application = rows.applications.find(item => item.positionId === job?.id && item.applicantId === authUsers.lecturer.uid);
  const document = rows.documents.find(item => item.applicationId === application?.id && item.userId === authUsers.lecturer.uid);
  const interview = rows.interviews.find(item => item.applicationId === application?.id && item.candidateId === authUsers.lecturer.uid);
  const rating = rows.ratings.find(item => item.applicationId === application?.id && item.lecturerId === authUsers.lecturer.uid);

  const listedAuth = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    listedAuth.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  const authIds = new Set(listedAuth.map(item => item.uid));

  const academicIntegrity = {
    collegesValid: rows.colleges.every(item => universitiesById.has(item.universityId)),
    departmentsValid: rows.departments.every(item => collegesById.has(item.collegeId)),
    subjectsValid: rows.subjects.every(item => departmentsById.has(item.departmentId))
  };
  const applicationOrphans = rows.applications.filter(item => !usersById.has(item.applicantId)
    || !positionsById.has(item.positionId)
    || item.recruiterId !== positionsById.get(item.positionId)?.postedBy?.id);
  const documentOrphans = rows.documents.filter(item => !usersById.has(item.userId)
    || (item.recruiterId && !usersById.has(item.recruiterId))
    || (item.applicationId && !applicationsById.has(item.applicationId))
    || (item.positionId && !positionsById.has(item.positionId)));
  const interviewOrphans = rows.interviews.filter(item => !applicationsById.has(item.applicationId)
    || !positionsById.has(item.positionId)
    || !usersById.has(item.recruiterId)
    || !usersById.has(item.candidateId));
  const ratingOrphans = rows.ratings.filter(item => !applicationsById.has(item.applicationId)
    || !interviewsById.has(item.interviewId)
    || !usersById.has(item.recruiterId)
    || !usersById.has(item.lecturerId));

  const importantTypes = new Set([
    'application', 'application_status', 'document_uploaded', 'document_approved',
    'interview', 'interview_scheduled', 'interview_rescheduled', 'rating_request',
    'rating_received', 'rating_result'
  ]);
  const importantNotifications = rows.notifications.filter(item => importantTypes.has(item.type));

  const output = {
    projectId: PROJECT_ID,
    accounts: {
      superAdmin: Boolean(!authUsers.superAdmin.disabled && profiles.superAdmin?.role === 'admin'
        && (profiles.superAdmin.adminLevel === 'super' || profiles.superAdmin.isSuperAdmin === true)
        && activeProfile(profiles.superAdmin)),
      superAdminChecks: {
        authEnabled: !authUsers.superAdmin.disabled,
        profilePresent: Boolean(profiles.superAdmin),
        roleAdmin: profiles.superAdmin?.role === 'admin',
        explicitSuper: profiles.superAdmin?.adminLevel === 'super' || profiles.superAdmin?.isSuperAdmin === true,
        protectedByPolicy: profiles.superAdmin?.adminLevel === 'super' || profiles.superAdmin?.isSuperAdmin === true,
        active: activeProfile(profiles.superAdmin)
      },
      limitedAdmin: Boolean(!authUsers.limitedAdmin.disabled && profiles.limitedAdmin?.role === 'admin'
        && profiles.limitedAdmin.adminLevel === 'limited' && activeProfile(profiles.limitedAdmin)
        && JSON.stringify([...(profiles.limitedAdmin.permissions || [])].sort()) === JSON.stringify(['audit.view', 'reports.view'])),
      recruiter: Boolean(!authUsers.recruiter.disabled && profiles.recruiter?.role === 'recruiter' && activeProfile(profiles.recruiter)),
      lecturer: Boolean(!authUsers.lecturer.disabled && profiles.lecturer?.role === 'lecturer' && activeProfile(profiles.lecturer))
    },
    academic: {
      universities: rows.universities.length,
      colleges: rows.colleges.length,
      departments: rows.departments.length,
      subjects: rows.subjects.length,
      relationshipsValid: Object.values(academicIntegrity).every(Boolean)
    },
    workflow: {
      job: Boolean(job && job.status === 'open'),
      application: Boolean(application && application.recruiterId === authUsers.recruiter.uid),
      applicationStatus: application?.status || null,
      document: Boolean(document && document.status === 'approved' && document.recruiterId === authUsers.recruiter.uid),
      interview: Boolean(interview && interview.status === 'completed' && interview.recruiterId === authUsers.recruiter.uid),
      rating: Boolean(rating && rating.status === 'completed' && Number(rating.score ?? rating.rating) === 4)
    },
    integrity: {
      authUsers: listedAuth.length,
      userProfiles: rows.users.length,
      orphanAuthUsers: listedAuth.filter(item => !usersById.has(item.uid)).length,
      orphanUserProfiles: rows.users.filter(item => !authIds.has(item.id)).length,
      orphanApplications: applicationOrphans.length,
      orphanDocuments: documentOrphans.length,
      orphanInterviews: interviewOrphans.length,
      orphanRatings: ratingOrphans.length,
      invalidRecruiterIds: [...applicationOrphans, ...documentOrphans, ...interviewOrphans, ...ratingOrphans]
        .filter(item => item.recruiterId && usersById.get(item.recruiterId)?.role !== 'recruiter').length,
      invalidLecturerIds: [...applicationOrphans, ...ratingOrphans]
        .filter(item => (item.applicantId || item.lecturerId) && usersById.get(item.applicantId || item.lecturerId)?.role !== 'lecturer').length,
      duplicateJobs: duplicateCount(rows.positions, item => key(item.postedBy?.id, item.title)),
      duplicateApplications: duplicateCount(rows.applications, item => key(item.positionId, item.applicantId)),
      duplicateInterviews: duplicateCount(rows.interviews, item => item.applicationId),
      duplicateRatings: duplicateCount(rows.ratings, item => item.interviewId || item.requestId)
    },
    notifications: {
      importantCount: importantNotifications.length,
      byType: importantNotifications.reduce((result, item) => {
        result[item.type] = (result[item.type] || 0) + 1;
        return result;
      }, {}),
      missingRecipient: importantNotifications.filter(item => !item.userId && !item.receiver?.id && !item.receiverId).length,
      missingTarget: importantNotifications.filter(item => !item.applicationId && !item.documentId && !item.interviewId && !item.ratingId && !item.requestId && !item.positionId).length,
      missingDeepLink: importantNotifications.filter(item => !item.deepLink).length,
      missingEventKey: importantNotifications.filter(item => !item.eventKey).length,
      readStateMismatch: importantNotifications.filter(item => item.read === true && item.status === 'unread').length
    },
    counts: Object.fromEntries(collectionNames.map(name => [name, rows[name].length])),
    productionWrites: 0
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'PHASE_01S_READINESS_FAILED'}\n`);
  process.exitCode = 1;
});
