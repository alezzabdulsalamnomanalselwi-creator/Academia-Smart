const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function argsMap(argv) {
  const result = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key?.startsWith('--') || argv[i + 1] === undefined) throw new Error('Invalid arguments');
    result[key.slice(2)] = argv[i + 1];
  }
  return result;
}

const args = argsMap(process.argv);
const projectRoot = path.resolve(args['project-root'] || '.');
const backupRoot = path.resolve(args['backup-root'] || '');
const journalPath = path.resolve(args.journal || '');
const projectId = args.project;
const accountEmail = args.account;
const mode = args.mode;
if (!projectRoot || !backupRoot || !journalPath || !projectId || !accountEmail || !['preflight', 'execute'].includes(mode)) throw new Error('Missing required arguments');
if (projectId !== 'my-project-51bb7') throw new Error('ABORT_UNEXPECTED_PROJECT');
if (!backupRoot.includes(`${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${projectId}${path.sep}`)) throw new Error('ABORT_UNEXPECTED_BACKUP_ROOT');
if (fs.existsSync(journalPath)) throw new Error('Journal target already exists');
process.stdout.write(`${JSON.stringify({ status: 'PHASE_01E_TOOL_STARTED', mode, projectId })}\n`);

const cliAuth = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/auth'));
const { requireAuth } = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/requireAuth'));
const targetStages = [
  { stage: 'D1_LEAF_ACTIVITY', collections: ['notifications', 'adminNotifications', 'ratings', 'savedJobs', 'recruiterInterest', 'recruiterInterests'] },
  { stage: 'D2_DOCUMENT_INTERVIEW_ACTIVITY', collections: ['interviews', 'documents', 'verifications'] },
  { stage: 'D3_APPLICATIONS', collections: ['applications'] },
  { stage: 'D4_RECRUITMENT_ROOTS', collections: ['positions', 'jobs', 'recruiterRequests'] },
  { stage: 'D5_ACADEMIC_HIERARCHY', collections: ['subjects', 'departments', 'colleges', 'universities'] },
  { stage: 'D6_FIRESTORE_IDENTITIES', collections: ['users'] }
];
const targetCollections = [...new Set(targetStages.flatMap((item) => item.collections))];
const requiredCollections = [...new Set([...targetCollections, 'adminLogs', 'auditLogs'])];
const sensitiveFieldPattern = /^(password|plainPassword|plaintextPassword|tempPassword)$/i;

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

function sameJson(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function encodedPath(segments) {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

function docSegments(document) {
  const marker = '/documents/';
  const index = document.name.indexOf(marker);
  if (index < 0) throw new Error('ABORT_UNEXPECTED_DOCUMENT_NAME');
  return document.name.slice(index + marker.length).split('/').map(decodeURIComponent);
}

function stringField(document, name) {
  return document?.fields?.[name]?.stringValue;
}

function booleanField(document, name) {
  return document?.fields?.[name]?.booleanValue;
}

function containsSensitiveField(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.fields && Object.keys(value.fields).some((key) => sensitiveFieldPattern.test(key))) return true;
  return Object.values(value).some(containsSensitiveField);
}

function safeCounts(map) {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, docs]) => [name, docs.length]));
}

function writeJournal(payload) {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true });
  fs.writeFileSync(journalPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

async function fetchJson(url, token, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try { body = JSON.parse(text); } catch { throw new Error(`ABORT_NON_JSON_HTTP_${response.status}`); }
  }
  if (!response.ok) throw new Error(`ABORT_HTTP_${response.status}_${body?.error?.status || 'ERROR'}`);
  return body;
}

async function tokenForAccount() {
  const account = cliAuth.getAllAccounts().find((item) => item?.user?.email === accountEmail);
  if (!account) throw new Error('ABORT_FIREBASE_CLI_ACCOUNT_NOT_REGISTERED');
  const options = { project: projectId, account: accountEmail };
  cliAuth.setActiveAccount(options, account);
  await requireAuth(options);
  const refreshed = await cliAuth.getAccessToken(options.tokens.refresh_token, options.authScopes);
  if (!refreshed?.access_token) throw new Error('ABORT_ACCESS_TOKEN_UNAVAILABLE');
  return refreshed.access_token;
}

async function listCollectionIds(baseUrl, token, parentSegments = []) {
  const ids = [];
  let pageToken = '';
  do {
    const suffix = parentSegments.length ? `/${encodedPath(parentSegments)}` : '';
    const body = await fetchJson(`${baseUrl}${suffix}:listCollectionIds`, token, {
      method: 'POST',
      body: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) }
    });
    ids.push(...(body.collectionIds || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return [...new Set(ids)].sort();
}

async function listDocuments(baseUrl, token, segments) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300' });
    if (pageToken) query.set('pageToken', pageToken);
    const body = await fetchJson(`${baseUrl}/${encodedPath(segments)}?${query}`, token);
    documents.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return documents.sort((left, right) => left.name.localeCompare(right.name));
}

async function collectAllFirestore(token) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const roots = await listCollectionIds(baseUrl, token);
  const queue = [...new Set([...roots, ...requiredCollections])].sort().map((name) => [name]);
  const queued = new Set(queue.map((segments) => segments.join('/')));
  const collections = new Map();
  while (queue.length) {
    const segments = queue.shift();
    const documents = await listDocuments(baseUrl, token, segments);
    collections.set(segments.join('/'), documents);
    for (const document of documents) {
      const parent = docSegments(document);
      for (const childId of await listCollectionIds(baseUrl, token, parent)) {
        const child = [...parent, childId];
        const key = child.join('/');
        if (!queued.has(key)) {
          queued.add(key);
          queue.push(child);
        }
      }
    }
  }
  return { roots, collections };
}

async function listAuthUsers(token) {
  const users = [];
  let nextPageToken = '';
  do {
    const query = new URLSearchParams({ maxResults: '1000' });
    if (nextPageToken) query.set('nextPageToken', nextPageToken);
    const body = await fetchJson(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:batchGet?${query}`, token);
    users.push(...(body.users || []));
    nextPageToken = body.nextPageToken || '';
  } while (nextPageToken);
  return users;
}

function loadAndVerifyBackup() {
  const rootManifestPath = path.join(backupRoot, 'BACKUP-MANIFEST.json');
  const rootSidecarPath = path.join(backupRoot, 'BACKUP-MANIFEST.sha256');
  const firestoreManifestPath = path.join(backupRoot, 'firestore', 'FIRESTORE-MANIFEST.json');
  const authExportPath = path.join(backupRoot, 'auth', 'firebase-auth-export.json');
  for (const file of [rootManifestPath, rootSidecarPath, firestoreManifestPath, authExportPath]) if (!fs.existsSync(file)) throw new Error('ABORT_BACKUP_FILE_MISSING');
  const sidecar = fs.readFileSync(rootSidecarPath, 'utf8').trim().split(/\s+/)[0].toUpperCase();
  if (sha256(rootManifestPath) !== sidecar) throw new Error('ABORT_BACKUP_MANIFEST_CHECKSUM');
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
  if (rootManifest.projectId !== projectId || rootManifest.restoreReadinessStatus !== 'RESTORE_READY_FOR_TEST_DATA_RESET') throw new Error('ABORT_BACKUP_NOT_RESTORE_READY');
  for (const entry of rootManifest.files || []) {
    const filePath = path.join(backupRoot, entry.file);
    if (!fs.existsSync(filePath) || sha256(filePath) !== String(entry.sha256).toUpperCase()) throw new Error('ABORT_BACKUP_FILE_CHECKSUM');
  }
  const firestoreManifest = JSON.parse(fs.readFileSync(firestoreManifestPath, 'utf8'));
  if (firestoreManifest.projectId !== projectId || firestoreManifest.totalDocuments !== 294 || !firestoreManifest.verification?.allCountsMatch) throw new Error('ABORT_FIRESTORE_BACKUP_ASSERTION');
  const backupCollections = new Map();
  for (const entry of firestoreManifest.files) {
    const payload = JSON.parse(fs.readFileSync(path.join(backupRoot, 'firestore', entry.file), 'utf8'));
    if (payload.collectionPath !== entry.collectionPath || payload.documents.length !== entry.backupCount) throw new Error('ABORT_FIRESTORE_BACKUP_FILE_ASSERTION');
    backupCollections.set(entry.collectionPath, payload.documents.sort((left, right) => left.name.localeCompare(right.name)));
  }
  const backupUsers = backupCollections.get('users') || [];
  const superDocs = backupUsers.filter((document) => stringField(document, 'role') === 'admin' && (stringField(document, 'adminLevel') === 'super' || booleanField(document, 'isSuperAdmin') === true));
  if (superDocs.length !== 1) throw new Error('ABORT_BACKUP_SUPER_ADMIN_COUNT');
  const protectedDoc = superDocs[0];
  const protectedUid = protectedDoc.name.split('/').pop();
  const authExport = JSON.parse(fs.readFileSync(authExportPath, 'utf8'));
  if (!Array.isArray(authExport.users) || authExport.users.length !== 14 || new Set(authExport.users.map((user) => user.localId)).size !== 14) throw new Error('ABORT_AUTH_BACKUP_COUNT');
  const protectedAuth = authExport.users.find((user) => user.localId === protectedUid);
  if (!protectedAuth || protectedAuth.disabled) throw new Error('ABORT_AUTH_BACKUP_SUPER_ADMIN');
  if (!rootManifest.assertions?.SUPER_ADMIN_AUTH_PRESENT || !rootManifest.assertions?.SUPER_ADMIN_UID_PRESERVED || !rootManifest.assertions?.SUPER_ADMIN_FIRESTORE_DOC_PRESENT) throw new Error('ABORT_BACKUP_SUPER_ASSERTIONS');
  return { rootManifest, firestoreManifest, backupCollections, authExport, protectedDoc, protectedUid };
}

function names(documents) {
  return documents.map((document) => document.name).sort();
}

function idsFromAuth(users) {
  return users.map((user) => user.localId).sort();
}

function assertProtectedLive(collections, authUsers, backup) {
  const liveUsers = collections.get('users') || [];
  const liveDoc = liveUsers.find((document) => document.name.split('/').pop() === backup.protectedUid);
  const liveAuth = authUsers.find((user) => user.localId === backup.protectedUid);
  if (!liveDoc || !liveAuth || liveAuth.disabled) throw new Error('ABORT_PROTECTED_SUPER_ADMIN_MISSING_OR_DISABLED');
  if (stringField(liveDoc, 'role') !== 'admin' || stringField(liveDoc, 'adminLevel') !== 'super') throw new Error('ABORT_PROTECTED_SUPER_ADMIN_ROLE');
  if (String(stringField(liveDoc, 'email') || '').toLowerCase() !== String(liveAuth.email || '').toLowerCase()) throw new Error('ABORT_PROTECTED_SUPER_ADMIN_EMAIL_MISMATCH');
  if (liveDoc.name.split('/').pop() !== liveAuth.localId) throw new Error('ABORT_PROTECTED_SUPER_ADMIN_UID_MISMATCH');
  return { liveDoc, liveAuth };
}

async function preflight(token, backup) {
  const live = await collectAllFirestore(token);
  process.stdout.write(`${JSON.stringify({ status: 'PHASE_01E_FIRESTORE_READ_COMPLETE' })}\n`);
  const authUsers = await listAuthUsers(token);
  process.stdout.write(`${JSON.stringify({ status: 'PHASE_01E_AUTH_READ_COMPLETE' })}\n`);
  assertProtectedLive(live.collections, authUsers, backup);
  const expectedPaths = [...backup.backupCollections.keys()].sort();
  const livePaths = [...live.collections.keys()].sort();
  if (expectedPaths.join('\n') !== livePaths.join('\n')) throw new Error('ABORT_FIRESTORE_COLLECTION_PATH_DRIFT');
  for (const collectionPath of expectedPaths) {
    const expected = backup.backupCollections.get(collectionPath) || [];
    const actual = live.collections.get(collectionPath) || [];
    if (names(expected).join('\n') !== names(actual).join('\n')) throw new Error('ABORT_FIRESTORE_DOCUMENT_SET_DRIFT');
    const expectedByName = new Map(expected.map((document) => [document.name, document]));
    for (const document of actual) {
      const before = expectedByName.get(document.name);
      if (!before || !sameJson(before.fields || {}, document.fields || {}) || before.updateTime !== document.updateTime) throw new Error('ABORT_FIRESTORE_DOCUMENT_CHANGED_SINCE_BACKUP');
    }
  }
  if (idsFromAuth(backup.authExport.users).join('\n') !== idsFromAuth(authUsers).join('\n')) throw new Error('ABORT_AUTH_UID_SET_DRIFT');
  const protectedName = backup.protectedDoc.name;
  const candidates = new Map();
  for (const collection of targetCollections) {
    const documents = live.collections.get(collection) || [];
    const selected = collection === 'users' ? documents.filter((document) => document.name !== protectedName) : documents;
    if (selected.some((document) => document.name === protectedName)) throw new Error('ABORT_SUPER_ADMIN_FIRESTORE_DELETE_CANDIDATE');
    candidates.set(collection, selected);
  }
  const authCandidates = authUsers.filter((user) => user.localId !== backup.protectedUid);
  if (authCandidates.some((user) => user.localId === backup.protectedUid)) throw new Error('ABORT_SUPER_ADMIN_AUTH_DELETE_CANDIDATE');
  const firestoreDeleteCount = [...candidates.values()].reduce((sum, documents) => sum + documents.length, 0);
  const preTotal = [...live.collections.values()].reduce((sum, documents) => sum + documents.length, 0);
  const adminLogs = live.collections.get('adminLogs') || [];
  const passwordRecords = [...live.collections.values()].flat().filter((document) => containsSensitiveField({ fields: document.fields || {} })).length;
  if (preTotal !== 294 || firestoreDeleteCount !== 208 || authUsers.length !== 14 || authCandidates.length !== 13 || adminLogs.length !== 85 || passwordRecords !== 8) throw new Error('ABORT_PRE_RESET_COUNTS_UNEXPECTED');
  return { live, authUsers, candidates, authCandidates, firestoreDeleteCount, preTotal, adminLogsBefore: adminLogs.length, passwordRecordsBefore: passwordRecords };
}

async function deleteFirestoreCollection(token, collection, documents) {
  if (!documents.length) return 0;
  const writes = documents.map((document) => ({ delete: document.name, currentDocument: { updateTime: document.updateTime } }));
  await fetchJson(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:commit`, token, { method: 'POST', body: { writes } });
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const remaining = await listDocuments(baseUrl, token, [collection]);
  if (remaining.length !== (collection === 'users' ? 1 : 0)) throw new Error('ABORT_FIRESTORE_STAGE_READBACK');
  return documents.length;
}

async function assertProtectedAndLogs(token, backup, expectedAdminLogs) {
  const live = await collectAllFirestore(token);
  const authUsers = await listAuthUsers(token);
  assertProtectedLive(live.collections, authUsers, backup);
  const logs = (live.collections.get('adminLogs') || []).length;
  if (logs !== expectedAdminLogs) throw new Error('ABORT_ADMIN_LOGS_CHANGED_DURING_RESET');
}

async function deleteAuthCandidates(token, backup, candidates) {
  let deleted = 0;
  for (const candidate of candidates) {
    if (candidate.localId === backup.protectedUid) throw new Error('ABORT_SUPER_ADMIN_AUTH_DELETE_CANDIDATE');
    const before = await listAuthUsers(token);
    const protectedBefore = before.find((user) => user.localId === backup.protectedUid);
    if (!protectedBefore || protectedBefore.disabled || !before.some((user) => user.localId === candidate.localId)) throw new Error('ABORT_AUTH_PRE_DELETE_ASSERTION');
    await fetchJson(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:delete`, token, { method: 'POST', body: { localId: candidate.localId } });
    const after = await listAuthUsers(token);
    const protectedAfter = after.find((user) => user.localId === backup.protectedUid);
    if (!protectedAfter || protectedAfter.disabled || after.some((user) => user.localId === candidate.localId)) throw new Error('ABORT_AUTH_DELETE_READBACK');
    deleted++;
  }
  return deleted;
}

async function createResetAudit(token, deletedByCollection, authDeleted, adminLogsBefore) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const name = `projects/${projectId}/databases/(default)/documents/adminLogs/phase01e_test_data_reset_${timestamp}`;
  const deletedFields = Object.fromEntries(Object.entries(deletedByCollection).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, { integerValue: String(value) }]));
  const update = {
    name,
    fields: {
      action: { stringValue: 'test_data_reset' },
      phase: { stringValue: 'PHASE_01E' },
      actor: { stringValue: 'explicit_super_admin/controlled_reset_tool' },
      protectedSuperAdmin: { booleanValue: true },
      externalFilesDeleted: { booleanValue: false },
      firestoreDeletedCount: { integerValue: String(Object.values(deletedByCollection).reduce((sum, value) => sum + value, 0)) },
      authDeletedCount: { integerValue: String(authDeleted) },
      adminLogsBefore: { integerValue: String(adminLogsBefore) },
      deletedCounts: { mapValue: { fields: deletedFields } }
    }
  };
  await fetchJson(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:commit`, token, {
    method: 'POST',
    body: { writes: [{ update, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] }] }
  });
}

async function postValidate(token, backup, adminLogsBefore) {
  const live = await collectAllFirestore(token);
  const authUsers = await listAuthUsers(token);
  assertProtectedLive(live.collections, authUsers, backup);
  const counts = safeCounts(live.collections);
  for (const collection of targetCollections) {
    const expected = collection === 'users' ? 1 : 0;
    if ((counts[collection] || 0) !== expected) throw new Error('ABORT_POST_RESET_TARGET_COUNT');
  }
  const adminLogsAfter = counts.adminLogs || 0;
  if (adminLogsAfter < adminLogsBefore) throw new Error('ABORT_ADMIN_LOGS_DECREASED');
  if (authUsers.length !== 1 || authUsers[0].localId !== backup.protectedUid || authUsers[0].disabled) throw new Error('ABORT_POST_RESET_AUTH_ASSERTION');
  const passwordRecords = [...live.collections.values()].flat().filter((document) => containsSensitiveField({ fields: document.fields || {} })).length;
  if (passwordRecords !== 0) throw new Error('ABORT_POST_RESET_PLAINTEXT_PASSWORD_ASSERTION');
  return { counts, authUsersAfter: authUsers.length, adminLogsAfter, passwordRecordsAfter: passwordRecords };
}

async function main() {
  const startedAt = new Date().toISOString();
  const backup = loadAndVerifyBackup();
  process.stdout.write(`${JSON.stringify({ status: 'PHASE_01E_BACKUP_VERIFIED' })}\n`);
  const token = await tokenForAccount();
  process.stdout.write(`${JSON.stringify({ status: 'PHASE_01E_CLI_SESSION_READY' })}\n`);
  const pre = await preflight(token, backup);
  const base = {
    phase: 'PHASE_01E',
    projectId,
    mode,
    startedAt,
    backupVerification: 'PASS',
    restoreReadiness: backup.rootManifest.restoreReadinessStatus,
    protectedSuperAdmin: true,
    superAdminAuthDeleteCandidate: false,
    superAdminFirestoreDeleteCandidate: false,
    preResetFirestoreTotal: pre.preTotal,
    preResetAuthUsers: pre.authUsers.length,
    preResetCounts: safeCounts(pre.live.collections),
    adminLogsBefore: pre.adminLogsBefore,
    passwordRecordsBefore: pre.passwordRecordsBefore,
    plannedFirestoreDeletes: pre.firestoreDeleteCount,
    plannedAuthDeletes: pre.authCandidates.length,
    externalReferenceInventoryRetained: true,
    externalFilesDeleted: false,
    rulesDeployed: false,
    seedCreated: false
  };
  if (mode === 'preflight') {
    const result = { ...base, status: 'PHASE_01E_EXECUTION_PREFLIGHT_PASS', productionWrites: 0 };
    writeJournal(result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const deletedByCollection = {};
  const completedStages = [];
  for (const stage of targetStages) {
    for (const collection of stage.collections) deletedByCollection[collection] = await deleteFirestoreCollection(token, collection, pre.candidates.get(collection) || []);
    await assertProtectedAndLogs(token, backup, pre.adminLogsBefore);
    completedStages.push(stage.stage);
  }
  const firestoreDeleted = Object.values(deletedByCollection).reduce((sum, value) => sum + value, 0);
  if (firestoreDeleted !== 208) throw new Error('ABORT_FIRESTORE_DELETED_COUNT');
  const authDeleted = await deleteAuthCandidates(token, backup, pre.authCandidates);
  if (authDeleted !== 13) throw new Error('ABORT_AUTH_DELETED_COUNT');
  await createResetAudit(token, deletedByCollection, authDeleted, pre.adminLogsBefore);
  const post = await postValidate(token, backup, pre.adminLogsBefore);
  const result = {
    ...base,
    status: 'PHASE_01E_CONTROLLED_PRODUCTION_RESET_PASS',
    completedAt: new Date().toISOString(),
    completedStages: [...completedStages, 'D7_AUTH_IDENTITIES', 'D8_VALIDATION'],
    deletedByCollection,
    firestoreDeleted,
    authDeleted,
    postResetCounts: post.counts,
    postResetAuthUsers: post.authUsersAfter,
    adminLogsAfter: post.adminLogsAfter,
    passwordRecordsAfter: post.passwordRecordsAfter,
    superAdminAuthPreserved: true,
    superAdminFirestorePreserved: true,
    superAdminUidUnchanged: true,
    adminLogsPreserved: post.adminLogsAfter >= pre.adminLogsBefore,
    cleanTargetAssertions: 'PASS',
    errors: [],
    retries: 0
  };
  writeJournal(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const result = {
    phase: 'PHASE_01E',
    projectId,
    mode,
    status: 'ABORTED',
    completedAt: new Date().toISOString(),
    errorCode: String(error.message || 'UNKNOWN').slice(0, 160),
    externalFilesDeleted: false,
    rulesDeployed: false,
    seedCreated: false
  };
  try { writeJournal(result); } catch {}
  process.stderr.write(`PHASE_01E_RESET_ABORTED: ${result.errorCode}\n`);
  process.exitCode = 1;
});
