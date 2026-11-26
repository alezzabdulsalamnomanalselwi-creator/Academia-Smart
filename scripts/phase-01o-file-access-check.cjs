const fs = require('fs');
const path = require('path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'my-project-51bb7';
const API_BASE = 'http://localhost:5050';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const readJson = (flag, expectedSegment) => {
  const filePath = path.resolve(valueAfter(flag));
  if (!filePath.includes(expectedSegment) || !fs.statSync(filePath).isFile()) throw new Error(`${flag}_INVALID`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};
const parseEnv = content => Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return [];
  const index = trimmed.indexOf('=');
  return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]];
}));
const signIn = async (apiKey, email, password, label) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`${label}_SIGN_IN_FAILED_${response.status}`);
  return (await response.json()).idToken;
};
const signInWithCustomToken = async (apiKey, customToken) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`UNRELATED_SIGN_IN_FAILED_${response.status}`);
  return (await response.json()).idToken;
};
const readFile = (storagePath, token, documentId) => fetch(`${API_BASE}/uploads/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
  headers: {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(documentId ? { 'x-document-id': documentId } : {})
  }
});
const storagePathFromUrl = url => {
  const parsed = new URL(String(url || ''));
  const prefix = '/uploads/';
  const index = parsed.pathname.indexOf(prefix);
  if (index < 0) return '';
  return parsed.pathname.slice(index + prefix.length).split('/').map(decodeURIComponent).join('/');
};

(async () => {
  const sensitive = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`;
  const serviceAccount = readJson('--credential', sensitive);
  const recruiter = readJson('--recruiter-file', sensitive);
  const lecturer = readJson('--lecturer-file', sensitive);
  const unrelated = readJson('--unrelated-file', sensitive);
  const envPath = path.resolve(valueAfter('--env'));
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
  const apiKey = env.REACT_APP_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
  if (serviceAccount.project_id !== PROJECT_ID || recruiter.projectId !== PROJECT_ID || lecturer.projectId !== PROJECT_ID || !apiKey) {
    throw new Error('PROJECT_OR_CONFIGURATION_MISMATCH');
  }

  const app = initializeApp({ credential: cert(serviceAccount), projectId: PROJECT_ID }, `phase-01o-file-check-${Date.now()}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const unrelatedEmail = unrelated.limitedAdmin?.email || unrelated.email;
  const [recruiterUser, lecturerUser, unrelatedUser] = await Promise.all([
    auth.getUserByEmail(recruiter.recruiter01.email), auth.getUserByEmail(lecturer.lecturer01.email)
    , auth.getUserByEmail(unrelatedEmail)
  ]);
  const documents = await db.collection('documents').where('userId', '==', lecturerUser.uid).get();
  const document = documents.docs.map(item => ({ id: item.id, ...item.data() }))
    .find(item => item.recruiterId === recruiterUser.uid && item.storagePath);
  if (!document) throw new Error('TARGET_DOCUMENT_NOT_FOUND');
  const lecturerProfile = await db.collection('users').doc(lecturerUser.uid).get();
  const cvStoragePath = storagePathFromUrl(lecturerProfile.data()?.cvUrl);
  if (!cvStoragePath) throw new Error('TARGET_CV_NOT_FOUND');

  const [recruiterToken, lecturerToken, unrelatedToken] = await Promise.all([
    signIn(apiKey, recruiter.recruiter01.email, recruiter.recruiter01.password, 'RECRUITER'),
    signIn(apiKey, lecturer.lecturer01.email, lecturer.lecturer01.password, 'LECTURER'),
    auth.createCustomToken(unrelatedUser.uid).then(token => signInWithCustomToken(apiKey, token))
  ]);
  const [anonymousResponse, ownerResponse, recruiterResponse, unrelatedResponse] = await Promise.all([
    readFile(document.storagePath, '', document.id),
    readFile(document.storagePath, lecturerToken, document.id),
    readFile(document.storagePath, recruiterToken, document.id),
    readFile(document.storagePath, unrelatedToken, document.id)
  ]);
  const [anonymousCvResponse, ownerCvResponse, recruiterCvResponse, unrelatedCvResponse] = await Promise.all([
    readFile(cvStoragePath, ''),
    readFile(cvStoragePath, lecturerToken),
    readFile(cvStoragePath, recruiterToken),
    readFile(cvStoragePath, unrelatedToken)
  ]);

  process.stdout.write(`${JSON.stringify({
    projectId: PROJECT_ID,
    documentId: document.id,
    anonymousDenied: anonymousResponse.status === 401,
    ownerAllowed: ownerResponse.status === 200,
    assignedRecruiterAllowed: recruiterResponse.status === 200,
    unrelatedUserDenied: unrelatedResponse.status === 403,
    cv: {
      anonymousDenied: anonymousCvResponse.status === 401,
      ownerAllowed: ownerCvResponse.status === 200,
      assignedRecruiterAllowed: recruiterCvResponse.status === 200,
      unrelatedUserDenied: unrelatedCvResponse.status === 403
    },
    statuses: {
      anonymous: anonymousResponse.status,
      owner: ownerResponse.status,
      assignedRecruiter: recruiterResponse.status,
      unrelatedUser: unrelatedResponse.status
    },
    secretsPrinted: false,
    productionWrites: 0
  }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`${error?.message || 'PHASE_01O_FILE_ACCESS_CHECK_FAILED'}\n`);
  process.exitCode = 1;
});
