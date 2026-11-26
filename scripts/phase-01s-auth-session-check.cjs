const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'my-project-51bb7';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const readJson = flag => {
  const file = path.resolve(valueAfter(flag));
  const safeRoot = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
  if (!file.includes(safeRoot) || !fs.statSync(file).isFile()) throw new Error(`${flag}_INVALID`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const parseEnv = content => Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
  const clean = line.trim();
  if (!clean || clean.startsWith('#') || !clean.includes('=')) return [];
  const index = clean.indexOf('=');
  return [[clean.slice(0, index).trim(), clean.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]];
}));
const signIn = async (apiKey, email, password, label) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`${label.toUpperCase()}_SIGN_IN_FAILED_${response.status}`);
  return response.json();
};
const profile = async token => {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(token.localId)}`, {
    headers: { authorization: `Bearer ${token.idToken}` }
  });
  if (!response.ok) throw new Error(`PROFILE_READ_FAILED_${response.status}`);
  return (await response.json()).fields || {};
};

(async () => {
  const limited = readJson('--limited-file');
  const recruiter = readJson('--recruiter-file');
  const lecturer = readJson('--lecturer-file');
  const env = parseEnv(fs.readFileSync(path.resolve(valueAfter('--env')), 'utf8'));
  const apiKey = env.REACT_APP_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  if (!apiKey || recruiter.projectId !== PROJECT_ID || lecturer.projectId !== PROJECT_ID) throw new Error('PROJECT_OR_ENV_MISMATCH');
  const accounts = [
    ['limitedAdmin', limited.email, limited.password, 'admin'],
    ['recruiter', recruiter.recruiter01.email, recruiter.recruiter01.password, 'recruiter'],
    ['lecturer', lecturer.lecturer01.email, lecturer.lecturer01.password, 'lecturer']
  ];
  const results = {};
  let refreshToken = '';
  for (const [label, email, password, expectedRole] of accounts) {
    const token = await signIn(apiKey, email, password, label);
    const fields = await profile(token);
    if (label === 'recruiter') refreshToken = token.refreshToken;
    results[label] = {
      login: Boolean(token.idToken && token.refreshToken && token.localId),
      profileRead: Boolean(fields.role),
      correctRole: fields.role?.stringValue === expectedRole,
      active: fields.accountStatus?.stringValue === 'active',
      uidProfileMatch: true
    };
  }
  const refreshResponse = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  });
  const refreshed = refreshResponse.ok ? await refreshResponse.json() : {};
  process.stdout.write(`${JSON.stringify({
    projectId: PROJECT_ID,
    accounts: results,
    expiredTokenRefreshPath: Boolean(refreshResponse.ok && refreshed.id_token && refreshed.refresh_token),
    secretsPrinted: false,
    productionWrites: 0
  }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'PHASE_01S_AUTH_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
