const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'my-project-51bb7';
const EMAIL = 'recruiter01-phase1l@academia-smart.test';

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};

const fail = message => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const credentialsPath = path.resolve(value('--credentials') || '');
const envPath = path.resolve(value('--env') || '');
const sensitiveSegment = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
if (!credentialsPath.includes(sensitiveSegment) || !fs.existsSync(credentialsPath) || !fs.existsSync(envPath)) {
  fail('ABORT_REQUIRED_LOCAL_FILE_MISSING');
}

const parseEnv = content => Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return [];
  const index = trimmed.indexOf('=');
  const key = trimmed.slice(0, index).trim();
  const raw = trimmed.slice(index + 1).trim();
  const valueText = raw.replace(/^(['"])(.*)\1$/, '$2');
  return [[key, valueText]];
}));

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
const password = credentials.recruiter01?.password;
const apiKey = env.REACT_APP_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
if (credentials.projectId !== PROJECT_ID || credentials.recruiter01?.email !== EMAIL || !password || !apiKey) {
  fail('ABORT_LOCAL_CONFIGURATION_INVALID');
}

(async () => {
  const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password, returnSecureToken: true })
  });
  if (!signInResponse.ok) fail(`SIGN_IN_FAILED:${signInResponse.status}`);
  const signedIn = await signInResponse.json();
  const profileResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(signedIn.localId)}`, {
    headers: { authorization: `Bearer ${signedIn.idToken}` }
  });
  if (!profileResponse.ok) fail(`PROFILE_READ_FAILED:${profileResponse.status}`);
  const profile = await profileResponse.json();
  const fields = profile.fields || {};
  process.stdout.write(JSON.stringify({
    signInPass: true,
    profileReadPass: true,
    roleRecruiter: fields.role?.stringValue === 'recruiter',
    accountStatusActive: fields.accountStatus?.stringValue === 'active',
    tokenPrinted: false,
    productionWrites: 0
  }));
})().catch(error => fail(`PHASE_01L_ACCESS_CHECK_FAILED:${error?.message || 'UNKNOWN'}`));
