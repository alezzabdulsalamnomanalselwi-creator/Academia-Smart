const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};

const readSecretLine = () => new Promise((resolve, reject) => {
  const input = readline.createInterface({ input: process.stdin, terminal: false });
  input.once('line', line => { input.close(); resolve(line); });
  input.once('error', reject);
});

const main = async () => {
  const credentialPath = path.resolve(value('--credential') || '');
  const accountPath = path.resolve(value('--account-file') || '');
  if (!credentialPath || !accountPath) throw new Error('REQUIRED_SAFE_INPUT_MISSING');

  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  const accountData = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
  const projectId = 'my-project-51bb7';
  const email = 'lecturer01-phase1m@academia-smart.test';
  if (serviceAccount.project_id !== projectId || accountData.projectId !== projectId
    || String(accountData.lecturer01?.email || '').toLowerCase() !== email) {
    throw new Error('PROJECT_OR_ACCOUNT_MISMATCH');
  }

  const password = await readSecretLine();
  if (!password || password.length < 6 || password.length > 128) throw new Error('INVALID_PASSWORD_INPUT');

  const app = initializeApp({ credential: cert(serviceAccount), projectId }, 'phase-01m-password-update');
  const auth = getAuth(app);
  const db = getFirestore(app);
  const beforeAuth = await auth.getUserByEmail(email);
  const profileRef = db.collection('users').doc(beforeAuth.uid);
  const beforeProfile = await profileRef.get();
  if (!beforeProfile.exists || beforeProfile.data().role !== 'lecturer') throw new Error('LECTURER_PROFILE_INVALID');
  const beforeProfileJson = JSON.stringify(beforeProfile.data());

  await auth.updateUser(beforeAuth.uid, { password });
  const afterAuth = await auth.getUser(beforeAuth.uid);
  const afterProfile = await profileRef.get();

  if (afterAuth.uid !== beforeAuth.uid || afterAuth.email !== beforeAuth.email
    || afterAuth.disabled !== beforeAuth.disabled || JSON.stringify(afterProfile.data()) !== beforeProfileJson) {
    throw new Error('NON_PASSWORD_STATE_CHANGED');
  }

  accountData.lecturer01.password = password;
  accountData.lecturer01.passwordUpdatedAt = new Date().toISOString();
  const temporary = `${accountPath}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(accountData, null, 2)}\n`, { encoding: 'utf8', flag: 'w', mode: 0o600 });
  fs.renameSync(temporary, accountPath);

  process.stdout.write(`${JSON.stringify({
    passwordUpdate: 'PASS',
    authUserExists: true,
    authEnabled: afterAuth.disabled === false,
    uidUnchanged: true,
    emailUnchanged: true,
    firestoreProfileUnchanged: true,
    academicRelationsUnchanged: true,
    localCredentialUpdated: true
  })}\n`);
};

main().catch(error => {
  process.stderr.write(`${error?.code || error?.message || 'PASSWORD_UPDATE_FAILED'}\n`);
  process.exitCode = 1;
});
