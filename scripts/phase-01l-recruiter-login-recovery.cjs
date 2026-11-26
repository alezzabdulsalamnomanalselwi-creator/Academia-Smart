const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'my-project-51bb7';
const EMAIL = 'recruiter01-phase1l@academia-smart.test';
const UNIVERSITY_NAME = 'جامعة الاختبار التقنية';

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};

const fail = message => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const serviceAccountPath = path.resolve(value('--service-account') || '');
const credentialsPath = path.resolve(value('--credentials') || '');
const shouldUpdatePassword = process.argv.includes('--update-password');
const requestedPassword = value('--password');
const sensitiveSegment = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;

if (!serviceAccountPath.includes(sensitiveSegment) || !credentialsPath.includes(sensitiveSegment)) {
  fail('ABORT_UNSAFE_SENSITIVE_PATH');
}
if (!fs.existsSync(serviceAccountPath) || !fs.existsSync(credentialsPath)) {
  fail('ABORT_REQUIRED_LOCAL_CREDENTIAL_FILE_MISSING');
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const localCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
if (serviceAccount.project_id !== PROJECT_ID || localCredentials.projectId !== PROJECT_ID) {
  fail('ABORT_PROJECT_MISMATCH');
}
if (String(localCredentials.recruiter01?.email || '').toLowerCase() !== EMAIL) {
  fail('ABORT_RECRUITER_CREDENTIAL_MISMATCH');
}

const app = getApps()[0] || initializeApp({
  credential: cert(serviceAccount),
  projectId: PROJECT_ID
});
const auth = getAuth(app);
const db = getFirestore(app);

(async () => {
  const authUser = await auth.getUserByEmail(EMAIL);
  const [profileSnapshot, universitySnapshot, requestSnapshot, sameEmailProfiles, auditSnapshot] = await Promise.all([
    db.collection('users').doc(authUser.uid).get(),
    db.collection('universities').where('name', '==', UNIVERSITY_NAME).get(),
    db.collection('recruiterRequests').where('email', '==', EMAIL).get(),
    db.collection('users').where('email', '==', EMAIL).get(),
    db.collection('adminLogs').where('target', '==', authUser.uid).get()
  ]);

  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const activeUniversities = universitySnapshot.docs.filter(document => document.data().active !== false);
  const expectedUniversityId = activeUniversities.length === 1 ? activeUniversities[0].id : '';
  const approvedRequests = requestSnapshot.docs.filter(document => document.data().status === 'approved');
  const requestUidMatches = approvedRequests.length === 1
    && approvedRequests[0].data().authUid === authUser.uid
    && approvedRequests[0].data().provisionedUid === authUser.uid;
  const profileIdMatches = profileSnapshot.exists && profileSnapshot.id === authUser.uid;
  const securityAuditDetails = auditSnapshot.docs
    .map(document => document.data())
    .filter(entry => entry.action === 'update_user_security')
    .map(entry => {
      try { return JSON.parse(entry.details || '{}'); } catch { return {}; }
    });
  const auditContainsSecretFields = auditSnapshot.docs.some(document =>
    /password|private_key|token|secret/i.test(JSON.stringify(document.data()))
  );

  const checks = {
    projectMatches: serviceAccount.project_id === PROJECT_ID,
    authUserExists: true,
    authEmailMatches: String(authUser.email || '').toLowerCase() === EMAIL,
    authEnabled: authUser.disabled === false,
    emailVerified: authUser.emailVerified === true,
    emailVerifiedRequiredByApp: false,
    userDocumentExists: profileSnapshot.exists,
    roleRecruiter: profile.role === 'recruiter',
    accountStatusActive: profile.accountStatus === 'active',
    accountStatusBlocked: profile.accountStatus === 'blocked',
    universityIdCorrect: Boolean(expectedUniversityId) && profile.universityId === expectedUniversityId,
    profileIdMatchesAuthUid: profileIdMatches,
    approvedRequestUidMatches: requestUidMatches,
    duplicateProfileCount: sameEmailProfiles.size,
    blockAuditExists: securityAuditDetails.some(details => details.accountStatus === 'blocked'),
    unblockAuditExists: securityAuditDetails.some(details => details.accountStatus === 'active'),
    auditContainsSecretFields,
    passwordUpdatePerformed: false,
    localCredentialUpdated: false,
    firestoreWrites: 0,
    authUserCreated: false
  };

  const safeToUpdate = checks.projectMatches
    && checks.authEmailMatches
    && checks.authEnabled
    && checks.userDocumentExists
    && checks.roleRecruiter
    && checks.accountStatusActive
    && checks.universityIdCorrect
    && checks.profileIdMatchesAuthUid
    && checks.approvedRequestUidMatches
    && checks.duplicateProfileCount === 1;

  if (shouldUpdatePassword) {
    if (!safeToUpdate) fail('ABORT_RECRUITER_INTEGRITY_CHECK_FAILED');
    const newPassword = requestedPassword || `${crypto.randomBytes(24).toString('base64url')}!aA7`;
    if (newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      fail('ABORT_PASSWORD_POLICY_FAILED');
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${credentialsPath}.pre-password-update-${timestamp}.bak`;
    const temporaryPath = `${credentialsPath}.pending-${timestamp}`;
    const nextCredentials = {
      ...localCredentials,
      recruiter01: { ...localCredentials.recruiter01, password: newPassword },
      recruiter01PasswordUpdatedAt: new Date().toISOString()
    };

    fs.copyFileSync(credentialsPath, backupPath, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(backupPath, 0o600);
    fs.writeFileSync(temporaryPath, `${JSON.stringify(nextCredentials, null, 2)}\n`, {
      encoding: 'utf8', flag: 'wx', mode: 0o600
    });
    await auth.updateUser(authUser.uid, { password: newPassword });
    fs.renameSync(temporaryPath, credentialsPath);
    fs.chmodSync(credentialsPath, 0o600);
    checks.passwordUpdatePerformed = true;
    checks.localCredentialUpdated = true;
  }

  process.stdout.write(JSON.stringify(checks));
})().catch(error => fail(`PHASE_01L_RECRUITER_RECOVERY_FAILED:${error?.code || error?.message || 'UNKNOWN'}`));
