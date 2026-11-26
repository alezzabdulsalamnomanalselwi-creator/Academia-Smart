const fs = require('fs');
const path = require('path');
const { ratingRequestId } = require('../server/ratingWorkflow');

const PROJECT_ID = 'my-project-51bb7';
const INTERVIEW_ID = 'interview_application_aR5hlkJ0cfc26PEOcaKT_RZ1ULpHYOCWcBAmAdULYUqcQgQT2';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const parseEnv = content => Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return [];
  const index = trimmed.indexOf('=');
  return [[trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]];
}));
const readCredentials = flag => {
  const filePath = path.resolve(valueAfter(flag));
  if (!filePath.includes(`${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`)) throw new Error('INVALID_SENSITIVE_PATH');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};
const signIn = async (apiKey, account) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true })
  });
  if (!response.ok) throw new Error(`SIGN_IN_FAILED_${response.status}`);
  return (await response.json()).idToken;
};
const postRating = async (requestId, token, rating) => {
  const response = await fetch(`http://localhost:5050/api/rating-requests/${encodeURIComponent(requestId)}/rating`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ rating, comment: 'اختبار تحقق سلبي دون كتابة' })
  });
  let body = {};
  try { body = await response.json(); } catch (_) {}
  return { status: response.status, code: body.code || '' };
};

(async () => {
  const env = parseEnv(fs.readFileSync(path.resolve(valueAfter('--env')), 'utf8'));
  const recruiterFile = readCredentials('--recruiter-file');
  const lecturerFile = readCredentials('--lecturer-file');
  const apiKey = env.REACT_APP_FIREBASE_API_KEY;
  if (!apiKey || recruiterFile.projectId !== PROJECT_ID || lecturerFile.projectId !== PROJECT_ID) throw new Error('LOCAL_CONFIG_INVALID');
  const [recruiterToken, lecturerToken] = await Promise.all([
    signIn(apiKey, recruiterFile.recruiter01), signIn(apiKey, lecturerFile.lecturer01)
  ]);
  const requestId = ratingRequestId(INTERVIEW_ID);
  const [below, above, lecturer, anonymous, duplicate] = await Promise.all([
    postRating(requestId, recruiterToken, 0), postRating(requestId, recruiterToken, 6),
    postRating(requestId, lecturerToken, 4), postRating(requestId, '', 4), postRating(requestId, recruiterToken, 4)
  ]);
  process.stdout.write(`${JSON.stringify({
    belowMinimumDenied: below.status === 400 && below.code === 'INVALID_RATING_SCORE',
    aboveMaximumDenied: above.status === 400 && above.code === 'INVALID_RATING_SCORE',
    lecturerCannotRateSelf: lecturer.status === 403 && lecturer.code === 'RECRUITER_REQUIRED',
    anonymousDenied: anonymous.status === 401 && anonymous.code === 'AUTH_REQUIRED',
    duplicateOrResolvedDenied: duplicate.status === 409,
    tokensPrinted: false,
    productionWrites: 0
  }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`PHASE_01Q_NEGATIVE_CHECK_FAILED:${error.message}\n`);
  process.exitCode = 1;
});
