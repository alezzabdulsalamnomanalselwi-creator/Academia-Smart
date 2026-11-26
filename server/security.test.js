const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  hasAllowedSignature,
  hasPermission,
  isExtensionAllowed,
  isSuperAdmin,
  normalizeEmail,
  resolvePathWithinRoot,
  safeOriginalName,
  sanitizeSegment
} = require('./security');
const { app, maxMb, originAllowed } = require('./index');

const projectRoot = path.resolve(__dirname, '..');

test('normalizes account input without exposing secrets', () => {
  assert.equal(normalizeEmail('  Recruiter@Example.COM '), 'recruiter@example.com');
  assert.equal(sanitizeSegment('../../user name'), '______user_name');
  assert.equal(safeOriginalName('../../secret.pdf'), 'secret.pdf');
});

test('blocks traversal outside uploads root', () => {
  const root = path.join(projectRoot, 'server', 'uploads');
  assert.equal(resolvePathWithinRoot(root, '../../.env'), null);
  assert.ok(resolvePathWithinRoot(root, 'uid/document/file.pdf').startsWith(path.resolve(root)));
});

test('validates extension and file magic bytes together', () => {
  assert.equal(isExtensionAllowed('application/pdf', 'cv.pdf'), true);
  assert.equal(isExtensionAllowed('application/pdf', 'cv.exe'), false);
  assert.equal(hasAllowedSignature(Buffer.from('%PDF-1.7'), 'application/pdf'), true);
  assert.equal(hasAllowedSignature(Buffer.from('not a pdf'), 'application/pdf'), false);
  assert.equal(hasAllowedSignature(Buffer.from('89504e470d0a1a0a', 'hex'), 'image/png'), true);
  assert.equal(hasAllowedSignature(Buffer.from('504b0304', 'hex'), 'application/zip'), true);
});

test('enforces super and limited admin permissions', () => {
  const limited = { role: 'admin', adminLevel: 'limited', permissions: ['requests.manage'] };
  const legacySuper = { role: 'admin' };
  assert.equal(isSuperAdmin(limited), false);
  assert.equal(hasPermission(limited, 'requests.manage'), true);
  assert.equal(hasPermission(limited, 'users.manage'), false);
  assert.equal(isSuperAdmin(legacySuper), true);
});

test('CORS has no arbitrary-origin fallback and file limit is capped at 25MB', () => {
  assert.equal(originAllowed('https://attacker.invalid'), false);
  assert.ok(maxMb <= 25);
});

test('health response does not disclose an absolute upload path and anonymous upload is denied', async t => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  const healthBody = await health.json();
  assert.equal(Object.prototype.hasOwnProperty.call(healthBody, 'uploadsRoot'), false);
  const upload = await fetch(`${base}/api/files/upload`, { method: 'POST' });
  assert.equal(upload.status, 401);
  assert.equal((await upload.json()).code, 'AUTH_REQUIRED');
});

test('Firestore rules are deny-by-default and protect self privilege fields', () => {
  const rules = fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8');
  assert.doesNotMatch(rules, /match\s+\/\{document=\*\*\}[\s\S]*allow\s+read,\s*write:\s*if\s+signedIn\(\)/);
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(safeProfileFields\(\)\)/);
  assert.match(rules, /match \/recruiterRequests\/\{id\}[\s\S]*allow create, update, delete: if false/);
});

test('new recruiter requests do not persist plaintext passwords', () => {
  const serverSource = fs.readFileSync(path.join(projectRoot, 'server', 'index.js'), 'utf8');
  const requestWrite = serverSource.match(/transaction\.create\(requestRef, \{([\s\S]*?)\n\s*\}\);/);
  assert.ok(requestWrite, 'request transaction was not found');
  assert.doesNotMatch(requestWrite[1], /\bpassword\s*:/);
  const signupSource = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'auth', 'RecruiterSignUp.jsx'), 'utf8');
  assert.doesNotMatch(signupSource, /addDoc\(collection\(db,\s*['"]recruiterRequests['"]/);
});

test('mark all read does not overwrite business status', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'firebase', 'notificationService.js'), 'utf8');
  const functionBody = source.match(/export const markNotificationsRead[\s\S]*?return unread\.length;/);
  assert.ok(functionBody);
  assert.doesNotMatch(functionBody[0], /status\s*:/);
  assert.match(functionBody[0], /read:\s*true/);
});

test('document review supports explicit approve and reject notifications with a required rejection note', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'dashboard', 'ReviewDocuments.jsx'), 'utf8');
  assert.match(source, /document_approved/);
  assert.match(source, /document_rejected/);
  assert.match(source, /if\s*\(status\s*===\s*['"]rejected['"]\s*&&\s*!comment\)/);
  assert.match(source, /reviewerId\s*:/);
  assert.match(source, /reviewedAt\s*:\s*serverTimestamp\(\)/);
});

test('interview workflow uses deterministic identity, exact deep links, and all supported lifecycle outcomes', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'dashboard', 'ManageInterviews.jsx'), 'utf8');
  assert.match(source, /interviewDocumentId\(selected\.id\)/);
  assert.match(source, /writeBatch\(db\)/);
  assert.match(source, /status:'interview_scheduled'/);
  assert.match(source, /interview_rescheduled/);
  assert.match(source, /section=interviews&interviewId=/);
  for (const status of ['completed', 'cancelled', 'no_show']) assert.match(source, new RegExp(`['"]${status}['"]`));
});
