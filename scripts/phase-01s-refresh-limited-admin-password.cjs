const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const PROJECT_ID = 'my-project-51bb7';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const safeFile = flag => {
  const file = path.resolve(valueAfter(flag));
  const root = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
  if (!file.includes(root) || !fs.statSync(file).isFile()) throw new Error(`${flag}_INVALID`);
  return file;
};
const parseEnv = content => Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
  const clean = line.trim();
  if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
  const index = clean.indexOf('=');
  return [[clean.slice(0, index).trim(), clean.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]];
}));

(async () => {
  const credentialPath = safeFile('--credential');
  const accountPath = safeFile('--account-file');
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  const account = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
  const env = parseEnv(fs.readFileSync(path.resolve(valueAfter('--env')), 'utf8'));
  const apiKey = env.REACT_APP_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  if (serviceAccount.project_id !== PROJECT_ID || !account.email || !apiKey) throw new Error('CONFIGURATION_INVALID');

  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, `phase-01s-password-${Date.now()}`);
  const auth = getAuth(app);
  const before = await auth.getUserByEmail(account.email);
  if (before.disabled) throw new Error('LIMITED_ADMIN_DISABLED');
  const password = `La1!${crypto.randomBytes(18).toString('base64url')}`;
  await auth.updateUser(before.uid, { password });
  const after = await auth.getUser(before.uid);
  if (after.uid !== before.uid || after.email !== before.email || after.disabled) throw new Error('AUTH_READBACK_FAILED');

  const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password, returnSecureToken: true })
  });
  if (!signIn.ok) throw new Error(`LOGIN_READBACK_FAILED_${signIn.status}`);
  const backupPath = `${accountPath}.pre-phase1s-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
  fs.copyFileSync(accountPath, backupPath, fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(accountPath, `${JSON.stringify({ ...account, password, passwordUpdatedAt: new Date().toISOString() }, null, 2)}\n`, { flag: 'w', mode: 0o600 });
  process.stdout.write(`${JSON.stringify({
    account: 'limited-admin-test',
    authUserPreserved: after.uid === before.uid,
    enabled: !after.disabled,
    passwordUpdated: true,
    loginVerified: true,
    sensitiveBackupCreated: true,
    secretPrinted: false
  })}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'LIMITED_ADMIN_PASSWORD_REFRESH_FAILED'}\n`);
  process.exitCode = 1;
});
