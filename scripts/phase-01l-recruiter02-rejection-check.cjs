const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'my-project-51bb7';
const EMAIL = 'recruiter02-phase1l@academia-smart.test';
const UNIVERSITY_NAME = 'جامعة الأكاديمية النموذجية';
const REQUEST_ID = crypto.createHash('sha256').update(EMAIL).digest('hex').slice(0, 40);

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const fail = message => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};
const getAuthUser = async (auth, email) => {
  try { return await auth.getUserByEmail(email); }
  catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
};

const serviceAccountPath = path.resolve(value('--service-account') || '');
const expectedStatus = value('--expected-status');
const sensitiveSegment = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
if (!serviceAccountPath.includes(sensitiveSegment) || !fs.existsSync(serviceAccountPath)) fail('ABORT_SERVICE_ACCOUNT_MISSING');
if (!['pending', 'rejected'].includes(expectedStatus)) fail('ABORT_EXPECTED_STATUS_REQUIRED');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (serviceAccount.project_id !== PROJECT_ID) fail('ABORT_PROJECT_MISMATCH');
const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

(async () => {
  const [requestSnapshot, requestMatches, universitySnapshot, recruiterProfiles, recruiter02Auth,
    recruiter01Auth, superAdminAuth, limitedAdminAuth, recruiter01Profiles, superAdminProfiles,
    limitedAdminProfiles, rejectionAudit] = await Promise.all([
    db.collection('recruiterRequests').doc(REQUEST_ID).get(),
    db.collection('recruiterRequests').where('email', '==', EMAIL).get(),
    db.collection('universities').where('name', '==', UNIVERSITY_NAME).get(),
    db.collection('users').where('email', '==', EMAIL).get(),
    getAuthUser(auth, EMAIL),
    getAuthUser(auth, 'recruiter01-phase1l@academia-smart.test'),
    getAuthUser(auth, 'admin@system.com'),
    getAuthUser(auth, 'limited-admin-phase1k@academia-smart.test'),
    db.collection('users').where('email', '==', 'recruiter01-phase1l@academia-smart.test').get(),
    db.collection('users').where('email', '==', 'admin@system.com').get(),
    db.collection('users').where('email', '==', 'limited-admin-phase1k@academia-smart.test').get(),
    db.collection('adminLogs').doc(`reject_recruiter_request_${REQUEST_ID}`).get()
  ]);

  const request = requestSnapshot.exists ? requestSnapshot.data() : {};
  const activeUniversities = universitySnapshot.docs.filter(document => document.data().active !== false);
  const expectedUniversityId = activeUniversities.length === 1 ? activeUniversities[0].id : '';
  const sensitiveFieldPresent = Object.keys(request).some(key => /password|plaintext|secret/i.test(key));
  const recruiter01Profile = recruiter01Profiles.size === 1 ? recruiter01Profiles.docs[0].data() : {};
  const superAdminProfile = superAdminProfiles.size === 1 ? superAdminProfiles.docs[0].data() : {};
  const limitedAdminProfile = limitedAdminProfiles.size === 1 ? limitedAdminProfiles.docs[0].data() : {};
  const rejectionAuditData = rejectionAudit.exists ? rejectionAudit.data() : {};
  const [authUsers, usersCount, requestsCount, ...workflowCounts] = await Promise.all([
    auth.listUsers(1000),
    db.collection('users').count().get(),
    db.collection('recruiterRequests').count().get(),
    ...['positions', 'applications', 'documents', 'interviews', 'ratings', 'notifications'].map(name => db.collection(name).count().get())
  ]);

  process.stdout.write(JSON.stringify({
    requestExists: requestSnapshot.exists,
    requestStatusMatches: request.status === expectedStatus,
    plaintextPasswordStored: sensitiveFieldPresent,
    universityIdCorrect: Boolean(expectedUniversityId) && request.universityId === expectedUniversityId,
    duplicateRequestCount: requestMatches.size,
    pendingAuthExists: expectedStatus === 'pending' ? Boolean(recruiter02Auth) : null,
    pendingAuthDisabled: expectedStatus === 'pending' ? recruiter02Auth?.disabled === true : null,
    requestAuthUidMatches: expectedStatus === 'pending' ? Boolean(recruiter02Auth) && request.authUid === recruiter02Auth.uid : null,
    rejectedAuthAbsent: expectedStatus === 'rejected' ? recruiter02Auth === null : null,
    recruiterProfileAbsent: recruiterProfiles.empty,
    rejectionAuditExists: expectedStatus === 'rejected' ? rejectionAudit.exists : null,
    rejectionAuditHasNoSecret: expectedStatus === 'rejected' ? rejectionAudit.exists && !/password|private_key|token|secret/i.test(JSON.stringify(rejectionAuditData)) : null,
    recruiter01Unaffected: Boolean(recruiter01Auth) && recruiter01Auth.disabled === false && recruiter01Profiles.size === 1 && recruiter01Profile.role === 'recruiter' && recruiter01Profile.accountStatus === 'active',
    superAdminUnaffected: Boolean(superAdminAuth) && superAdminAuth.disabled === false && superAdminProfiles.size === 1 && superAdminProfile.role === 'admin' && (superAdminProfile.adminLevel === 'super' || superAdminProfile.isSuperAdmin === true),
    limitedAdminUnaffected: Boolean(limitedAdminAuth) && limitedAdminAuth.disabled === false && limitedAdminProfiles.size === 1 && limitedAdminProfile.role === 'admin' && limitedAdminProfile.adminLevel === 'limited' && JSON.stringify([...(limitedAdminProfile.permissions || [])].sort()) === JSON.stringify(['audit.view', 'reports.view']),
    authUsersCount: authUsers.users.length,
    firestoreUsersCount: usersCount.data().count,
    recruiterRequestsCount: requestsCount.data().count,
    workflowCollectionsRemainEmpty: workflowCounts.every(snapshot => snapshot.data().count === 0),
    productionWrites: 0
  }));
})().catch(error => fail(`PHASE_01L_REJECTION_CHECK_FAILED:${error?.code || error?.message || 'UNKNOWN'}`));
