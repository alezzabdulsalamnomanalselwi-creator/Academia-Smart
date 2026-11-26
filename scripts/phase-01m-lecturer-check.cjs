const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};

const credentialPath = path.resolve(value('--credential') || '');
const accountPath = path.resolve(value('--account-file') || '');
if (!credentialPath || !accountPath) throw new Error('REQUIRED_SAFE_INPUT_MISSING');

const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
const accountData = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
const projectId = 'my-project-51bb7';
if (serviceAccount.project_id !== projectId || accountData.projectId !== projectId) {
  throw new Error('PROJECT_MISMATCH');
}

const app = initializeApp({ credential: cert(serviceAccount), projectId }, 'phase-01m-lecturer-check');

const main = async () => {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const email = String(accountData.lecturer01?.email || '').trim().toLowerCase();
  if (!email) throw new Error('LECTURER_EMAIL_MISSING');

  const authUser = await auth.getUserByEmail(email);
  const userSnapshot = await db.collection('users').doc(authUser.uid).get();
  const user = userSnapshot.exists ? userSnapshot.data() : {};
  const emailProfiles = await db.collection('users').where('email', '==', email).get();
  const separateLecturerProfile = await db.collection('lecturers').doc(authUser.uid).get();
  const separateLecturerProfileAlt = await db.collection('lecturerProfiles').doc(authUser.uid).get();
  const experiences = Array.isArray(user.teachingExperience) ? user.teachingExperience : [];
  const experience = experiences[0] || {};
  const [university, college, department, subject] = await Promise.all([
    experience.universityId ? db.collection('universities').doc(experience.universityId).get() : null,
    experience.collegeId ? db.collection('colleges').doc(experience.collegeId).get() : null,
    experience.departmentId ? db.collection('departments').doc(experience.departmentId).get() : null,
    experience.subjectId ? db.collection('subjects').doc(experience.subjectId).get() : null
  ]);
  const forbiddenKeys = ['password', 'passwordHash', 'salt', 'private_key', 'token'];
  const presentForbiddenKeys = forbiddenKeys.filter(key => Object.prototype.hasOwnProperty.call(user, key));
  const auditSnapshot = await db.collection('adminLogs').where('target', '==', authUser.uid).get();
  const securityAudits = auditSnapshot.docs.map(item => item.data())
    .filter(item => item.action === 'update_user_security');
  const auditDetails = securityAudits.map(item => {
    try { return JSON.parse(item.details || '{}'); } catch (_) { return {}; }
  });
  const auditActorIds = [...new Set(securityAudits.map(item => item.adminId).filter(Boolean))];
  const auditActorSnapshots = await Promise.all(auditActorIds.map(id => db.collection('users').doc(id).get()));
  const auditActorsAreSuperAdmins = auditActorSnapshots.length > 0 && auditActorSnapshots.every(item => {
    if (!item.exists) return false;
    const data = item.data();
    return data.role === 'admin' && (data.adminLevel === 'super' || data.isSuperAdmin === true
      || (!Object.prototype.hasOwnProperty.call(data, 'adminLevel') && !Object.prototype.hasOwnProperty.call(data, 'permissions')));
  });

  const result = {
  projectId,
  authUserExists: Boolean(authUser.uid),
  authEnabled: authUser.disabled === false,
  firestoreUserExists: userSnapshot.exists,
  roleLecturer: user.role === 'lecturer',
  accountActive: user.accountStatus === 'active',
  accountBlocked: user.accountStatus === 'blocked',
  canonicalProfileLocation: userSnapshot.exists ? 'users/{authUid}' : 'missing',
  separateLecturerCollectionRequired: false,
  unexpectedSeparateProfileFound: separateLecturerProfile.exists || separateLecturerProfileAlt.exists,
  noAdminLevel: !Object.prototype.hasOwnProperty.call(user, 'adminLevel'),
  noPermissions: !Object.prototype.hasOwnProperty.call(user, 'permissions'),
  noSuperAdminMarker: user.isSuperAdmin !== true,
  duplicateAuthAccount: false,
  matchingFirestoreProfiles: emailProfiles.size,
  noDuplicateFirestoreProfile: emailProfiles.size === 1 && emailProfiles.docs[0].id === authUser.uid,
  noPlaintextOrSecretFields: presentForbiddenKeys.length === 0,
  academicRelationsRequiredAtSignup: false,
  academicRelationsPresentAtSignup: ['universityId', 'collegeId', 'departmentId'].some(key => Boolean(user[key])),
  uidProfileMatch: userSnapshot.id === authUser.uid,
  schemaFieldsPresent: ['firstName', 'lastName', 'email', 'phoneNumber', 'role', 'accountStatus', 'createdAt']
    .every(key => Object.prototype.hasOwnProperty.call(user, key)),
  profilePopulated: Boolean(user.education && user.department && user.yearsExperience),
  qualificationPresent: Boolean(user.education),
  experienceCount: experiences.length,
  skillsCount: Array.isArray(user.skills) ? user.skills.length : 0,
  academicRelationshipValid: Boolean(
    university?.exists && college?.exists && department?.exists && subject?.exists
    && college.data().universityId === university.id
    && department.data().collegeId === college.id
    && subject.data().departmentId === department.id
  ),
  lecturerCannotPersistTrustedVerificationAtProfileLevel: !Object.prototype.hasOwnProperty.call(user, 'verified')
    && !Object.prototype.hasOwnProperty.call(user, 'verifiedBy'),
  experienceVerificationIsUntrustedPending: experiences.length === 1
    && experience.verified === false
    && experience.verifiedBy === null
    && experience.verificationStatus === 'pending',
  blockAuditExists: auditDetails.some(details => details.accountStatus === 'blocked'),
  unblockAuditExists: auditDetails.some(details => details.accountStatus === 'active'),
  auditActorsAreSuperAdmins,
  auditContainsNoSensitiveKeys: securityAudits.every(item => !/password|token|private[_-]?key|secret/i.test(JSON.stringify(item)))
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

main().catch(error => {
  process.stderr.write(`${error?.code || error?.message || 'LECTURER_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
