const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require('@firebase/rules-unit-testing');
const {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} = require('firebase/firestore');

const PROJECT_ID = 'demo-academia-smart-phase1a';
const PASSWORD = 'LocalOnly!123';
const UID = {
  lecturerA: 'lecturer-a',
  lecturerB: 'lecturer-b',
  recruiterA: 'recruiter-a',
  recruiterB: 'recruiter-b',
  limitedAdmin: 'limited-admin',
  limitedReadOnly: 'limited-readonly-admin',
  superAdmin: 'super-admin',
  blocked: 'blocked-user'
};

let testEnv;
let admin;
let adminAuth;
let adminDb;
let server;
let baseUrl;
let uploadsRoot;

const splitHost = (value, fallbackPort) => {
  const [host, port] = String(value || `127.0.0.1:${fallbackPort}`).split(':');
  return { host, port: Number(port) };
};

const rulesDb = uid => testEnv.authenticatedContext(uid, {
  email: `${uid}@phase1a.test`,
  email_verified: true
}).firestore();

const authRequest = async (action, payload) => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=local-emulator-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { response, body };
};

const signIn = async email => {
  const result = await authRequest('signInWithPassword', {
    email,
    password: PASSWORD,
    returnSecureToken: true
  });
  if (!result.response.ok) {
    const error = new Error(result.body?.error?.message || 'AUTH_SIGN_IN_FAILED');
    error.code = result.body?.error?.message;
    throw error;
  }
  return result.body.idToken;
};

const api = async (url, { token, ...options } = {}) => {
  const headers = new Headers(options.headers || {});
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${url}`, { ...options, headers });
};

const seedRulesFixtures = async () => {
  const users = {
    [UID.lecturerA]: { firstName: 'Lecturer', lastName: 'A', email: 'lecturer-a@phase1a.test', role: 'lecturer', accountStatus: 'active' },
    [UID.lecturerB]: { firstName: 'Lecturer', lastName: 'B', email: 'lecturer-b@phase1a.test', role: 'lecturer', accountStatus: 'active' },
    [UID.recruiterA]: { firstName: 'Recruiter', lastName: 'A', email: 'recruiter-a@phase1a.test', role: 'recruiter', accountStatus: 'active', universityId: 'uni-active' },
    [UID.recruiterB]: { firstName: 'Recruiter', lastName: 'B', email: 'recruiter-b@phase1a.test', role: 'recruiter', accountStatus: 'active', universityId: 'uni-active' },
    [UID.limitedAdmin]: { firstName: 'Limited', lastName: 'Admin', email: 'limited-admin@phase1a.test', role: 'admin', adminLevel: 'limited', permissions: ['users.manage', 'requests.manage'], accountStatus: 'active' },
    [UID.limitedReadOnly]: { firstName: 'Read Only', lastName: 'Admin', email: 'limited-readonly@phase1a.test', role: 'admin', adminLevel: 'limited', permissions: ['reports.view', 'audit.view'], accountStatus: 'active' },
    [UID.superAdmin]: { firstName: 'Super', lastName: 'Admin', email: 'super-admin@phase1a.test', role: 'admin', adminLevel: 'super', permissions: ['*'], accountStatus: 'active' },
    [UID.blocked]: { firstName: 'Blocked', lastName: 'User', email: 'blocked@phase1a.test', role: 'lecturer', accountStatus: 'blocked' }
  };

  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const writes = Object.entries(users).map(([uid, data]) => setDoc(doc(db, 'users', uid), data));
    writes.push(
      setDoc(doc(db, 'universities', 'uni-active'), { name: 'Local Test University', active: true }),
      setDoc(doc(db, 'positions', 'position-a'), { title: 'Position A', status: 'open', postedBy: { id: UID.recruiterA } }),
      setDoc(doc(db, 'positions', 'position-b'), { title: 'Position B', status: 'open', postedBy: { id: UID.recruiterB } }),
      setDoc(doc(db, 'applications', 'application-a'), { positionId: 'position-a', applicantId: UID.lecturerA, recruiterId: UID.recruiterA, status: 'pending' }),
      setDoc(doc(db, 'applications', 'application-b'), { positionId: 'position-b', applicantId: UID.lecturerB, recruiterId: UID.recruiterB, status: 'pending' }),
      setDoc(doc(db, 'documents', 'document-a'), { userId: UID.lecturerA, recruiterId: UID.recruiterA, title: 'Document A', status: 'pending' }),
      setDoc(doc(db, 'documents', 'document-b'), { userId: UID.lecturerB, recruiterId: UID.recruiterB, title: 'Document B', status: 'pending' }),
      setDoc(doc(db, 'interviews', 'interview-a'), { applicationId: 'application-a', candidateId: UID.lecturerA, recruiterId: UID.recruiterA, status: 'scheduled' }),
      setDoc(doc(db, 'interviews', 'interview-b'), { applicationId: 'application-b', candidateId: UID.lecturerB, recruiterId: UID.recruiterB, status: 'scheduled' }),
      setDoc(doc(db, 'ratings', 'rating-a'), { lecturerId: UID.lecturerA, recruiterId: UID.recruiterA, rating: 4 }),
      setDoc(doc(db, 'ratings', 'rating-b'), { lecturerId: UID.lecturerB, recruiterId: UID.recruiterB, rating: 5 }),
      setDoc(doc(db, 'notifications', 'notification-a1'), { userId: UID.lecturerA, receiver: { id: UID.lecturerA }, sender: { id: UID.recruiterA }, type: 'application_status', read: false, status: 'pending', businessStatus: 'pending' }),
      setDoc(doc(db, 'notifications', 'notification-a2'), { userId: UID.lecturerA, receiver: { id: UID.lecturerA }, sender: { id: UID.recruiterA }, type: 'document_review', read: false, status: 'pending', businessStatus: 'pending' }),
      setDoc(doc(db, 'notifications', 'notification-b'), { userId: UID.lecturerB, receiver: { id: UID.lecturerB }, sender: { id: UID.recruiterB }, type: 'application_status', read: false, status: 'pending' }),
      setDoc(doc(db, 'notifications', 'notification-rating'), { userId: UID.recruiterA, receiver: { id: UID.recruiterA }, sender: { id: UID.lecturerA }, type: 'rating_request', read: false, status: 'pending' })
    );
    await Promise.all(writes);
  });
};

before(async () => {
  assert.match(PROJECT_ID, /^demo-/);
  const firestore = splitHost(process.env.FIRESTORE_EMULATOR_HOST, 8080);
  const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { ...firestore, rules } });
  await testEnv.clearFirestore();
  await seedRulesFixtures();

  process.env.FIREBASE_PROJECT_ID = PROJECT_ID;
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
  process.env.FILE_API_ALLOWED_ORIGINS = 'http://127.0.0.1:3000';
  process.env.FILE_API_ALLOW_LOCALHOST = 'true';
  uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'academia-smart-phase1a-uploads-'));
  process.env.FILE_UPLOAD_DIR = uploadsRoot;

  admin = require('../../server/firebaseAdmin').getFirebaseAdmin();
  adminAuth = admin.auth;
  adminDb = admin.db;
  for (const account of [
    { uid: UID.superAdmin, email: 'super-admin@phase1a.test' },
    { uid: UID.limitedAdmin, email: 'limited-admin@phase1a.test' },
    { uid: UID.limitedReadOnly, email: 'limited-readonly@phase1a.test' },
    { uid: UID.lecturerA, email: 'lecturer-a@phase1a.test' },
    { uid: UID.lecturerB, email: 'lecturer-b@phase1a.test' },
    { uid: UID.recruiterA, email: 'recruiter-a@phase1a.test' }
  ]) {
    await adminAuth.createUser({ ...account, password: PASSWORD, disabled: false, emailVerified: true });
  }

  const { app } = require('../../server/index');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (testEnv) await testEnv.cleanup();
  if (uploadsRoot && path.dirname(uploadsRoot) === os.tmpdir() && path.basename(uploadsRoot).startsWith('academia-smart-phase1a-uploads-')) {
    fs.rmSync(uploadsRoot, { recursive: true, force: true });
  }
});

test('USERS: owner can read and update only safe profile fields', async () => {
  const db = rulesDb(UID.lecturerA);
  await assertSucceeds(getDoc(doc(db, 'users', UID.lecturerA)));
  await assertSucceeds(updateDoc(doc(db, 'users', UID.lecturerA), { firstName: 'Lecturer Updated' }));
  for (const patch of [
    { role: 'admin' },
    { permissions: ['*'] },
    { adminLevel: 'super' },
    { accountStatus: 'blocked' },
    { blocked: false }
  ]) {
    await assertFails(updateDoc(doc(db, 'users', UID.lecturerA), patch));
  }
});

test('USERS: lecturer and recruiter cannot mutate another user or self-escalate', async () => {
  await assertFails(updateDoc(doc(rulesDb(UID.lecturerA), 'users', UID.lecturerB), { accountStatus: 'blocked' }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterA), 'users', UID.recruiterA), { role: 'admin' }));
  await assertFails(getDoc(doc(rulesDb(UID.lecturerA), 'users', UID.lecturerB)));
});

test('PHASE 1K RBAC: Limited Admin cannot change or block Super Admin', async () => {
  const db = rulesDb(UID.limitedAdmin);
  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { accountStatus: 'blocked' }));
  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { permissions: [] }));

  const token = await signIn('limited-admin@phase1a.test');
  const response = await api(`/api/admin/users/${UID.superAdmin}/security`, {
    token,
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountStatus: 'blocked' })
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'SUPER_ADMIN_PROTECTED');
});

test('PHASE 1K RBAC: read-only Limited Admin is restricted to reports and audit data', async () => {
  const db = rulesDb(UID.limitedReadOnly);

  await assertSucceeds(getDoc(doc(db, 'universities', 'uni-active')));
  await assertSucceeds(getDoc(doc(db, 'adminLogs', 'seed-log')));

  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { accountStatus: 'blocked' }));
  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { role: 'lecturer' }));
  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { adminLevel: 'limited' }));
  await assertFails(updateDoc(doc(db, 'users', UID.superAdmin), { permissions: [] }));
  await assertFails(updateDoc(doc(db, 'users', UID.limitedReadOnly), { adminLevel: 'super' }));
  await assertFails(updateDoc(doc(db, 'users', UID.limitedReadOnly), { permissions: ['*'] }));
  await assertFails(setDoc(doc(db, 'universities', 'limited-write-denied'), { name: 'Denied', active: true }));

  const token = await signIn('limited-readonly@phase1a.test');
  const createAdmin = await api('/api/admin/users/limited-admin', {
    token,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Denied', lastName: 'Admin', email: 'denied-admin@phase1k.test',
      password: PASSWORD, permissions: ['reports.view']
    })
  });
  assert.equal(createAdmin.status, 403);
  assert.equal((await createAdmin.json()).code, 'PERMISSION_DENIED');

  const changeSelf = await api(`/api/admin/users/${UID.limitedReadOnly}/security`, {
    token,
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ permissions: ['*'] })
  });
  assert.equal(changeSelf.status, 403);
  assert.equal((await changeSelf.json()).code, 'PERMISSION_DENIED');
});

test('PHASE 1K AUTH: Limited Admin creation endpoint enforces token and Super Admin gates', async () => {
  const endpoint = '/api/admin/users/limited-admin';
  const email = 'created-limited-admin@phase1k.test';
  const request = token => api(endpoint, {
    token,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Created', lastName: 'Limited', email, password: PASSWORD,
      permissions: ['reports.view', 'audit.view']
    })
  });

  const missing = await request();
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).code, 'AUTH_REQUIRED');

  const invalid = await request('invalid-token');
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).code, 'INVALID_TOKEN');

  const nonAdmin = await request(await signIn('lecturer-a@phase1a.test'));
  assert.equal(nonAdmin.status, 403);
  assert.equal((await nonAdmin.json()).code, 'PERMISSION_DENIED');

  const readOnlyAdmin = await request(await signIn('limited-readonly@phase1a.test'));
  assert.equal(readOnlyAdmin.status, 403);
  assert.equal((await readOnlyAdmin.json()).code, 'PERMISSION_DENIED');

  const privilegedLimited = await request(await signIn('limited-admin@phase1a.test'));
  assert.equal(privilegedLimited.status, 403);
  assert.equal((await privilegedLimited.json()).code, 'SUPER_ADMIN_REQUIRED');

  const revocableToken = await signIn('limited-readonly@phase1a.test');
  await new Promise(resolve => setTimeout(resolve, 1100));
  await adminAuth.revokeRefreshTokens(UID.limitedReadOnly);
  const revoked = await request(revocableToken);
  assert.equal(revoked.status, 401);
  assert.equal((await revoked.json()).code, 'INVALID_TOKEN');

  const created = await request(await signIn('super-admin@phase1a.test'));
  assert.equal(created.status, 201);
  const { uid } = await created.json();
  assert.equal(typeof uid, 'string');

  const [authUser, userDoc, auditDoc] = await Promise.all([
    adminAuth.getUser(uid),
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('adminLogs').doc(`create_limited_admin_${uid}`).get()
  ]);
  assert.equal(authUser.disabled, false);
  assert.equal(userDoc.exists, true);
  assert.equal(userDoc.data().role, 'admin');
  assert.equal(userDoc.data().adminLevel, 'limited');
  assert.equal(userDoc.data().accountStatus, 'active');
  assert.deepEqual(userDoc.data().permissions, ['reports.view', 'audit.view']);
  assert.equal(auditDoc.exists, true);
  assert.equal(JSON.stringify(userDoc.data()).includes(PASSWORD), false);
  assert.equal(JSON.stringify(auditDoc.data()).includes(PASSWORD), false);

  await Promise.all([
    adminAuth.deleteUser(uid),
    adminDb.collection('users').doc(uid).delete(),
    adminDb.collection('adminLogs').doc(`create_limited_admin_${uid}`).delete()
  ]);
});

test('RBAC: Super Admin can perform an allowed academic administration action', async () => {
  const ref = doc(rulesDb(UID.superAdmin), 'universities', 'super-created-local');
  await assertSucceeds(setDoc(ref, { name: 'Super Local University', active: true }));
  await assertSucceeds(deleteDoc(ref));
});

test('APPLICATIONS: lecturer ownership is enforced for create and read', async () => {
  const lecturerDb = rulesDb(UID.lecturerA);
  await assertSucceeds(getDoc(doc(lecturerDb, 'applications', 'application-a')));
  await assertFails(getDoc(doc(lecturerDb, 'applications', 'application-b')));
  await assertSucceeds(setDoc(doc(lecturerDb, 'applications', 'application-new'), {
    positionId: 'position-a', applicantId: UID.lecturerA, recruiterId: UID.recruiterA, status: 'pending'
  }));
  await assertFails(setDoc(doc(lecturerDb, 'applications', 'application-forged'), {
    positionId: 'position-b', applicantId: UID.lecturerB, recruiterId: UID.recruiterB, status: 'pending'
  }));
});

test('APPLICATIONS: recruiter ownership is enforced for reads and mutations', async () => {
  const recruiterDb = rulesDb(UID.recruiterA);
  await assertSucceeds(getDoc(doc(recruiterDb, 'applications', 'application-a')));
  await assertFails(getDoc(doc(recruiterDb, 'applications', 'application-b')));
  await assertSucceeds(updateDoc(doc(recruiterDb, 'applications', 'application-a'), { status: 'under_review' }));
  await assertFails(updateDoc(doc(recruiterDb, 'applications', 'application-b'), { status: 'under_review' }));
  await assertFails(updateDoc(doc(recruiterDb, 'applications', 'application-a'), { recruiterId: UID.recruiterB }));
});

test('DOCUMENTS: lecturer and recruiter ownership plus immutable ownership fields', async () => {
  const lecturerDb = rulesDb(UID.lecturerA);
  const recruiterDb = rulesDb(UID.recruiterA);
  await assertSucceeds(getDoc(doc(lecturerDb, 'documents', 'document-a')));
  await assertFails(getDoc(doc(lecturerDb, 'documents', 'document-b')));
  await assertSucceeds(setDoc(doc(lecturerDb, 'documents', 'document-new'), {
    userId: UID.lecturerA, recruiterId: UID.recruiterA, title: 'New', status: 'pending'
  }));
  await assertSucceeds(updateDoc(doc(recruiterDb, 'documents', 'document-a'), {
    status: 'approved', reviewerComments: 'Local review'
  }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterB), 'documents', 'document-a'), { status: 'rejected' }));
  await assertFails(updateDoc(doc(recruiterDb, 'documents', 'document-a'), { recruiterId: UID.recruiterB }));
});

test('INTERVIEWS: access follows application recruiter and lecturer relationships', async () => {
  await assertSucceeds(getDoc(doc(rulesDb(UID.lecturerA), 'interviews', 'interview-a')));
  await assertFails(getDoc(doc(rulesDb(UID.lecturerA), 'interviews', 'interview-b')));
  await assertSucceeds(getDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-a')));
  await assertFails(getDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-b')));
  await assertSucceeds(setDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-new'), {
    applicationId: 'application-a', candidateId: UID.lecturerA, recruiterId: UID.recruiterA, status: 'scheduled'
  }));
  await assertFails(setDoc(doc(rulesDb(UID.recruiterB), 'interviews', 'interview-forged'), {
    applicationId: 'application-a', candidateId: UID.lecturerA, recruiterId: UID.recruiterB, status: 'scheduled'
  }));
  await assertFails(updateDoc(doc(rulesDb(UID.lecturerA), 'interviews', 'interview-a'), { status: 'cancelled' }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterB), 'interviews', 'interview-a'), { status: 'cancelled' }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-a'), { candidateId: UID.lecturerB }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-a'), { applicationId: 'application-b' }));
  for (const status of ['rescheduled', 'completed', 'no_show', 'cancelled']) {
    await assertSucceeds(updateDoc(doc(rulesDb(UID.recruiterA), 'interviews', 'interview-a'), { status }));
  }
});

test('INTERVIEWS: scheduled and rescheduled notifications use receiver-owned read semantics', async () => {
  const recruiterDb = rulesDb(UID.recruiterA);
  for (const [id, type] of [['interview-notification', 'interview'], ['interview-rescheduled-notification', 'interview_rescheduled']]) {
    await assertSucceeds(setDoc(doc(recruiterDb, 'notifications', id), {
      type, userId: UID.lecturerA, receiver: { id: UID.lecturerA }, sender: { id: UID.recruiterA },
      interviewId: 'interview-a', applicationId: 'application-a', read: false,
      deepLink: '/lecturer-dashboard?section=interviews&interviewId=interview-a'
    }));
    await assertSucceeds(updateDoc(doc(rulesDb(UID.lecturerA), 'notifications', id), { read: true, readAt: new Date() }));
    await assertFails(updateDoc(doc(rulesDb(UID.lecturerA), 'notifications', id), { interviewId: 'interview-b' }));
  }
});

test('RATINGS: only related parties can read and ratings are immutable', async () => {
  await assertSucceeds(getDoc(doc(rulesDb(UID.lecturerA), 'ratings', 'rating-a')));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'ratings', 'rating-a')));
  await assertFails(getDoc(doc(rulesDb(UID.lecturerA), 'ratings', 'rating-b')));
  await assertFails(getDoc(doc(rulesDb(UID.recruiterA), 'ratings', 'rating-b')));
  await assertFails(setDoc(doc(rulesDb(UID.recruiterA), 'ratings', 'forged-rating'), {
    lecturerId: UID.lecturerA, recruiterId: UID.recruiterA, rating: 4
  }));
  await assertFails(setDoc(doc(rulesDb(UID.lecturerA), 'ratings', 'self-rating'), {
    lecturerId: UID.lecturerA, recruiterId: UID.recruiterA, rating: 5
  }));
  await assertFails(updateDoc(doc(rulesDb(UID.recruiterA), 'ratings', 'rating-a'), { rating: 1 }));
});

test('RATING NOTIFICATIONS: clients cannot forge request or result events', async () => {
  await assertFails(setDoc(doc(rulesDb(UID.lecturerA), 'notifications', 'forged-rating-request'), {
    type: 'rating_request', sender: { id: UID.lecturerA }, receiver: { id: UID.recruiterA },
    userId: UID.recruiterA, read: false
  }));
  await assertFails(setDoc(doc(rulesDb(UID.recruiterA), 'notifications', 'forged-rating-result'), {
    type: 'rating_received', sender: { id: UID.recruiterA }, receiver: { id: UID.lecturerA },
    userId: UID.lecturerA, read: false
  }));
});

test('NOTIFICATIONS: receiver reads only own notifications', async () => {
  await assertSucceeds(getDoc(doc(rulesDb(UID.lecturerA), 'notifications', 'notification-a1')));
  await assertFails(getDoc(doc(rulesDb(UID.lecturerA), 'notifications', 'notification-b')));
});

test('NOTIFICATIONS: Mark One and Mark All change read/readAt only', async () => {
  const db = rulesDb(UID.lecturerA);
  await assertSucceeds(updateDoc(doc(db, 'notifications', 'notification-a1'), { read: true, readAt: new Date() }));
  const batch = writeBatch(db);
  batch.update(doc(db, 'notifications', 'notification-a1'), { read: true, readAt: new Date() });
  batch.update(doc(db, 'notifications', 'notification-a2'), { read: true, readAt: new Date() });
  await assertSucceeds(batch.commit());
  const [one, two] = await Promise.all([
    adminDb.collection('notifications').doc('notification-a1').get(),
    adminDb.collection('notifications').doc('notification-a2').get()
  ]);
  assert.equal(one.data().status, 'pending');
  assert.equal(two.data().businessStatus, 'pending');
});

test('NOTIFICATIONS: receiver cannot mutate business fields', async () => {
  const db = rulesDb(UID.lecturerA);
  await assertFails(updateDoc(doc(db, 'notifications', 'notification-a1'), { status: 'approved' }));
  await assertFails(updateDoc(doc(db, 'notifications', 'notification-a1'), { businessStatus: 'approved' }));
  await assertFails(updateDoc(doc(db, 'notifications', 'notification-a1'), { actionTakenBy: UID.lecturerA }));
});

test('NOTIFICATIONS: trusted backend records an authorized business action', async () => {
  const recruiterToken = await signIn('recruiter-a@phase1a.test');
  const response = await api('/api/notifications/notification-rating/action', {
    token: recruiterToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'accepted' })
  });
  assert.equal(response.status, 200);
  const updated = await adminDb.collection('notifications').doc('notification-rating').get();
  assert.equal(updated.data().status, 'accepted');
  assert.equal(updated.data().read, true);

  const lecturerToken = await signIn('lecturer-a@phase1a.test');
  const denied = await api('/api/notifications/notification-rating/action', {
    token: lecturerToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'rejected' })
  });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, 'RECRUITER_REQUIRED');
});

test('CATCH-ALL: arbitrary authenticated reads and writes are denied', async () => {
  const db = rulesDb(UID.lecturerA);
  await assertFails(getDoc(doc(db, 'arbitraryUnauthorized', 'secret')));
  await assertFails(setDoc(doc(db, 'arbitraryUnauthorized', 'write'), { elevated: true }));
});

test('BLOCKED: Firestore rejects a blocked user even with an authenticated context', async () => {
  const db = rulesDb(UID.blocked);
  await assertFails(getDoc(doc(db, 'users', UID.blocked)));
  await assertFails(getDoc(doc(db, 'positions', 'position-a')));
  await assertFails(setDoc(doc(db, 'arbitraryUnauthorized', 'blocked-write'), { value: true }));
});

test('RECRUITER FLOW: request has no secret, pending is visible, approval provisions a usable account', async () => {
  const email = 'new-recruiter@phase1a.test';
  const signup = await api('/api/recruiter-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'New', lastName: 'Recruiter', email, password: PASSWORD, universityId: 'uni-active' })
  });
  assert.equal(signup.status, 201);
  const signupBody = await signup.json();
  const request = await adminDb.collection('recruiterRequests').doc(signupBody.requestId).get();
  const requestData = request.data();
  assert.equal(requestData.status, 'pending');
  for (const field of ['password', 'plaintextPassword', 'passwordHash', 'secret']) assert.equal(field in requestData, false);
  const staged = await adminAuth.getUser(requestData.authUid);
  assert.equal(staged.disabled, true);
  await assert.rejects(() => signIn(email), error => error.code === 'USER_DISABLED');
  await assertSucceeds(getDoc(doc(rulesDb(UID.superAdmin), 'recruiterRequests', signupBody.requestId)));

  const adminToken = await signIn('super-admin@phase1a.test');
  const approve = await api(`/api/admin/recruiter-requests/${signupBody.requestId}/approve`, { token: adminToken, method: 'POST' });
  assert.equal(approve.status, 200);
  const approvedBody = await approve.json();
  assert.equal(approvedBody.duplicate, false);
  const [approvedRequest, profile, enabledUser, audit] = await Promise.all([
    adminDb.collection('recruiterRequests').doc(signupBody.requestId).get(),
    adminDb.collection('users').doc(requestData.authUid).get(),
    adminAuth.getUser(requestData.authUid),
    adminDb.collection('adminLogs').doc(`approve_recruiter_request_${signupBody.requestId}`).get()
  ]);
  assert.equal(approvedRequest.data().status, 'approved');
  assert.equal(profile.data().role, 'recruiter');
  assert.equal(profile.data().accountStatus, 'active');
  assert.equal(profile.data().universityId, 'uni-active');
  assert.equal(profile.data().email, email);
  assert.equal(enabledUser.disabled, false);
  assert.equal(audit.exists, true);
  assert.ok(await signIn(email));

  const usersBefore = (await adminAuth.listUsers()).users.length;
  const duplicate = await api(`/api/admin/recruiter-requests/${signupBody.requestId}/approve`, { token: adminToken, method: 'POST' });
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);
  assert.equal((await adminAuth.listUsers()).users.length, usersBefore);
});

test('RECRUITER FLOW: an existing Auth email is rejected clearly', async () => {
  const email = 'existing-recruiter@phase1a.test';
  await adminAuth.createUser({ email, password: PASSWORD, disabled: false });
  const response = await api('/api/recruiter-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Existing', lastName: 'Email', email, password: PASSWORD, universityId: 'uni-active' })
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'EMAIL_IN_USE');
});

test('RECRUITER FLOW: provisioning failure keeps request pending and creates no privilege state', async () => {
  const staged = await adminAuth.createUser({ email: 'mismatch-auth@phase1a.test', password: PASSWORD, disabled: true });
  const requestId = 'failure-injection-request';
  await adminDb.collection('recruiterRequests').doc(requestId).set({
    firstName: 'Failure', lastName: 'Injection', email: 'mismatch-request@phase1a.test',
    universityId: 'uni-active', university: 'Local Test University', authUid: staged.uid,
    status: 'pending', schemaVersion: 2
  });
  const adminToken = await signIn('super-admin@phase1a.test');
  const response = await api(`/api/admin/recruiter-requests/${requestId}/approve`, { token: adminToken, method: 'POST' });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'EMAIL_CONFLICT');
  const [request, profile, authUser] = await Promise.all([
    adminDb.collection('recruiterRequests').doc(requestId).get(),
    adminDb.collection('users').doc(staged.uid).get(),
    adminAuth.getUser(staged.uid)
  ]);
  assert.equal(request.data().status, 'pending');
  assert.equal(request.data().failureCode, 'EMAIL_CONFLICT');
  assert.equal(profile.exists, false);
  assert.equal(authUser.disabled, true);
});

test('RECRUITER FLOW: rejection creates no recruiter account or profile', async () => {
  const email = 'rejected-recruiter@phase1a.test';
  const signup = await api('/api/recruiter-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'Rejected', lastName: 'Recruiter', email, password: PASSWORD, universityId: 'uni-active' })
  });
  assert.equal(signup.status, 201);
  const { requestId } = await signup.json();
  const pending = await adminDb.collection('recruiterRequests').doc(requestId).get();
  const stagedUid = pending.data().authUid;
  const adminToken = await signIn('super-admin@phase1a.test');
  const response = await api(`/api/admin/recruiter-requests/${requestId}/reject`, {
    token: adminToken,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: 'Local emulator rejection' })
  });
  assert.equal(response.status, 200);
  const [rejectedRequest, rejectionAudit] = await Promise.all([
    adminDb.collection('recruiterRequests').doc(requestId).get(),
    adminDb.collection('adminLogs').doc(`reject_recruiter_request_${requestId}`).get()
  ]);
  assert.equal(rejectedRequest.data().status, 'rejected');
  assert.equal(rejectionAudit.exists, true);
  assert.equal((await adminDb.collection('users').doc(stagedUid).get()).exists, false);
  await assert.rejects(() => adminAuth.getUser(stagedUid), error => error.code === 'auth/user-not-found');
  await assert.rejects(() => signIn(email));
});

test('FILE API: anonymous, MIME, extension, size, traversal, ownership, and missing-file controls', async () => {
  const tokenA = await signIn('lecturer-a@phase1a.test');
  const tokenB = await signIn('lecturer-b@phase1a.test');
  const anonymous = await api('/api/files/upload', { method: 'POST' });
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).code, 'AUTH_REQUIRED');

  const upload = async (token, content, type, name) => {
    const form = new FormData();
    form.append('category', 'document');
    form.append('file', new Blob([content], { type }), name);
    return api('/api/files/upload', { token, method: 'POST', body: form });
  };

  const valid = await upload(tokenA, '%PDF-1.7\nlocal emulator', 'application/pdf', 'valid.pdf');
  assert.equal(valid.status, 201);
  const validBody = await valid.json();
  assert.equal(validBody.size > 0, true);
  assert.match(validBody.path, new RegExp(`^${UID.lecturerA}/document/`));

  const invalidMime = await upload(tokenA, 'plain text', 'text/plain', 'notes.txt');
  assert.equal(invalidMime.status, 415);
  assert.equal((await invalidMime.json()).code, 'FILE_TYPE_NOT_ALLOWED');

  const invalidExtension = await upload(tokenA, '%PDF-1.7', 'application/pdf', 'payload.exe');
  assert.equal(invalidExtension.status, 415);
  assert.equal((await invalidExtension.json()).code, 'FILE_TYPE_NOT_ALLOWED');

  const tooLarge = await upload(tokenA, Buffer.alloc((25 * 1024 * 1024) + 1, 0x41), 'application/pdf', 'large.pdf');
  assert.equal(tooLarge.status, 413);
  assert.equal((await tooLarge.json()).code, 'FILE_TOO_LARGE');

  const traversal = await upload(tokenA, '%PDF-1.7\ntraversal', 'application/pdf', '../../test.pdf');
  assert.equal(traversal.status, 201);
  const traversalBody = await traversal.json();
  assert.equal(traversalBody.name, 'test.pdf');
  assert.match(traversalBody.path, new RegExp(`^${UID.lecturerA}/document/`));
  assert.equal(traversalBody.path.includes('..'), false);

  const crossOwner = await api(new URL(validBody.url).pathname, { token: tokenB });
  assert.equal(crossOwner.status, 403);
  assert.equal((await crossOwner.json()).code, 'FILE_ACCESS_DENIED');

  const missing = await api(`/uploads/${UID.lecturerA}/document/missing.pdf`, { token: tokenA });
  assert.equal(missing.status, 404);
  const missingBody = await missing.json();
  assert.deepEqual(missingBody, { ok: false, code: 'FILE_NOT_FOUND', message: 'الملف غير متوفر أو تم نقله.' });
  assert.equal(JSON.stringify(missingBody).includes(uploadsRoot), false);
  assert.equal('stack' in missingBody, false);
});

test('BLOCKED SESSION: security update cuts off the existing Firestore and File API session', async () => {
  const userToken = await signIn('lecturer-b@phase1a.test');
  const adminToken = await signIn('super-admin@phase1a.test');
  const response = await api(`/api/admin/users/${UID.lecturerB}/security`, {
    token: adminToken,
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountStatus: 'blocked' })
  });
  assert.equal(response.status, 200);
  const oldSession = await api(`/uploads/${UID.lecturerB}/document/missing.pdf`, { token: userToken });
  assert.ok([401, 403].includes(oldSession.status));
  const body = await oldSession.json();
  assert.ok(['INVALID_TOKEN', 'ACCOUNT_DISABLED'].includes(body.code));
  await assertFails(getDoc(doc(rulesDb(UID.lecturerB), 'positions', 'position-a')));
  await assert.rejects(() => signIn('lecturer-b@phase1a.test'), error => error.code === 'USER_DISABLED');
});
