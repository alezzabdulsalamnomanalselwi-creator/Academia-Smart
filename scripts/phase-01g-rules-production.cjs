const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function parseArgs(argv) {
  const output = {};
  for (let index = 2; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) throw new Error('Invalid arguments');
    output[argv[index].slice(2)] = argv[index + 1];
  }
  return output;
}

const args = parseArgs(process.argv);
const mode = args.mode;
const projectId = args.project;
const accountEmail = args.account;
const projectRoot = path.resolve(args['project-root'] || '.');
const backupRoot = path.resolve(args['backup-root'] || '');
const phaseOutput = args.output ? path.resolve(args.output) : null;
if (!['backup', 'verify'].includes(mode) || !projectId || !accountEmail || !projectRoot || !backupRoot) throw new Error('Missing required arguments');
if (projectId !== 'my-project-51bb7') throw new Error('ABORT_UNEXPECTED_PROJECT');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('ABORT_EMULATOR_TARGETING_ACTIVE');

const cliAuth = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/auth'));
const { requireAuth } = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/requireAuth'));

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function normalizedRules(content) {
  return String(content).replace(/\r\n/g, '\n').trimEnd() + '\n';
}

function stringField(document, name) {
  return document?.fields?.[name]?.stringValue;
}

function booleanField(document, name) {
  return document?.fields?.[name]?.booleanValue;
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

async function listRootCollections(token) {
  const body = await fetchJson(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:listCollectionIds`, token, { method: 'POST', body: { pageSize: 1000 } });
  return [...new Set(body.collectionIds || [])].sort();
}

async function listCollection(token, collection) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300' });
    if (pageToken) query.set('pageToken', pageToken);
    const body = await fetchJson(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}?${query}`, token);
    documents.push(...(body.documents || []));
    pageToken = body.nextPageToken || '';
  } while (pageToken);
  return documents;
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

function verifyBackup() {
  const manifestPath = path.join(backupRoot, 'BACKUP-MANIFEST.json');
  const sidecarPath = path.join(backupRoot, 'BACKUP-MANIFEST.sha256');
  if (!fs.existsSync(manifestPath) || !fs.existsSync(sidecarPath)) throw new Error('ABORT_BACKUP_MANIFEST_MISSING');
  const expected = fs.readFileSync(sidecarPath, 'utf8').trim().split(/\s+/)[0].toUpperCase();
  if (sha256(manifestPath) !== expected) throw new Error('ABORT_BACKUP_MANIFEST_CHECKSUM');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const entry of manifest.files || []) {
    const file = path.join(backupRoot, entry.file);
    if (!fs.existsSync(file) || sha256(file) !== String(entry.sha256).toUpperCase()) throw new Error('ABORT_BACKUP_FILE_CHECKSUM');
  }
  if (manifest.projectId !== projectId
    || manifest.restoreReadinessStatus !== 'RESTORE_READY_FOR_TEST_DATA_RESET'
    || manifest.restoreValidation?.firestoreEmulator !== 'PASS'
    || manifest.restoreValidation?.firestoreBackupCount !== 294
    || manifest.restoreValidation?.firestoreRestoredCount !== 294
    || manifest.restoreValidation?.authEmulatorStructural !== 'PASS'
    || manifest.restoreValidation?.authBackupCount !== 14
    || manifest.restoreValidation?.authRestoredCount !== 14
    || !manifest.restoreValidation?.PASSWORD_HASH_CONFIG_PRESENT
    || !manifest.restoreValidation?.PASSWORD_HASH_CONFIG_VALID
    || !manifest.assertions?.SUPER_ADMIN_AUTH_PRESENT
    || !manifest.assertions?.SUPER_ADMIN_FIRESTORE_DOC_PRESENT) throw new Error('ABORT_BACKUP_READINESS_ASSERTION');
  return { manifest, checksum: expected };
}

async function productionState(token) {
  const expectedCounts = {
    users: 1,
    recruiterRequests: 0,
    applications: 0,
    documents: 0,
    interviews: 0,
    ratings: 0,
    notifications: 0,
    adminNotifications: 0,
    positions: 0,
    jobs: 0,
    universities: 0,
    colleges: 0,
    departments: 0,
    subjects: 0,
    verifications: 0,
    savedJobs: 0,
    recruiterInterest: 0,
    recruiterInterests: 0,
    auditLogs: 0
  };
  const roots = await listRootCollections(token);
  const collectionNames = [...new Set([...roots, ...Object.keys(expectedCounts), 'adminLogs'])].sort();
  const entries = await Promise.all(collectionNames.map(async (name) => [name, await listCollection(token, name)]));
  const data = new Map(entries);
  const counts = Object.fromEntries(entries.map(([name, documents]) => [name, documents.length]));
  for (const [name, expected] of Object.entries(expectedCounts)) if ((counts[name] || 0) !== expected) throw new Error('ABORT_CLEAN_DATABASE_COUNT');
  if ((counts.adminLogs || 0) < 86) throw new Error('ABORT_ADMIN_LOGS_COUNT');
  const authUsers = await listAuthUsers(token);
  if (authUsers.length !== 1 || authUsers[0].disabled) throw new Error('ABORT_AUTH_PROTECTED_ACCOUNT');
  const users = data.get('users') || [];
  if (users.length !== 1) throw new Error('ABORT_FIRESTORE_PROTECTED_ACCOUNT');
  const user = users[0];
  const uid = user.name.split('/').pop();
  if (uid !== authUsers[0].localId
    || stringField(user, 'role') !== 'admin'
    || stringField(user, 'adminLevel') !== 'super'
    || ['blocked', 'suspended', 'disabled'].includes(String(stringField(user, 'accountStatus') || '').toLowerCase())
    || String(stringField(user, 'email') || '').toLowerCase() !== String(authUsers[0].email || '').toLowerCase()) throw new Error('ABORT_SUPER_ADMIN_ASSERTION');
  return {
    counts,
    authUsers: authUsers.length,
    firestoreUsers: users.length,
    superAdminAuthPresent: true,
    superAdminAuthEnabled: true,
    superAdminFirestoreDocPresent: true,
    superAdminRoleValid: true,
    superAdminAdminLevel: 'super',
    superAdminBlocked: false
  };
}

async function activeRules(token) {
  const release = await fetchJson(`https://firebaserules.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/releases/cloud.firestore`, token);
  if (!release.rulesetName?.startsWith(`projects/${projectId}/rulesets/`)) throw new Error('ABORT_ACTIVE_RULESET_NAME');
  const ruleset = await fetchJson(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, token);
  const files = ruleset.source?.files || [];
  if (files.length !== 1 || typeof files[0].content !== 'string') throw new Error('ABORT_ACTIVE_RULESET_SOURCE');
  return { release, ruleset, fileName: files[0].name || 'firestore.rules', content: files[0].content };
}

async function main() {
  process.stdout.write(`${JSON.stringify({ status: 'PHASE_01G_TOOL_STARTED', mode, projectId })}\n`);
  const backup = verifyBackup();
  const token = await tokenForAccount();
  const state = await productionState(token);
  const rules = await activeRules(token);
  const localRulesPath = path.join(projectRoot, 'firestore.rules');
  if (!fs.existsSync(localRulesPath)) throw new Error('ABORT_LOCAL_RULES_MISSING');
  const localContent = fs.readFileSync(localRulesPath, 'utf8');
  const match = normalizedRules(rules.content) === normalizedRules(localContent);
  const common = {
    projectId,
    backupRestoreReadiness: backup.manifest.restoreReadinessStatus,
    backupManifestSHA256: backup.checksum,
    productionState: state,
    localRulesSHA256: sha256(localRulesPath),
    activeRulesMatchLocal: match,
    activeRulesetCreatedAt: rules.ruleset.createTime || null,
    activeReleaseUpdatedAt: rules.release.updateTime || null,
    emulatorTargetingActive: false
  };
  if (mode === 'backup') {
    if (!phaseOutput) throw new Error('Missing output directory');
    if (fs.existsSync(phaseOutput) && fs.readdirSync(phaseOutput).length) throw new Error('ABORT_OUTPUT_NOT_EMPTY');
    fs.mkdirSync(phaseOutput, { recursive: true });
    const rulesPath = path.join(phaseOutput, 'firestore.rules.production-before-phase01g.rules');
    fs.writeFileSync(rulesPath, rules.content, { encoding: 'utf8', flag: 'wx' });
    const rulesChecksum = sha256(rulesPath);
    const manifest = {
      schemaVersion: 1,
      purpose: 'Phase 1G immediate Firestore Rules rollback source',
      projectId,
      capturedAt: new Date().toISOString(),
      releaseName: rules.release.name,
      rulesetName: rules.release.rulesetName,
      sourceFileName: rules.fileName,
      rollbackRulesFile: path.basename(rulesPath),
      rollbackRulesSHA256: rulesChecksum,
      sourceValuesPrinted: false,
      productionState: state,
      backupManifestSHA256: backup.checksum
    };
    const manifestPath = path.join(phaseOutput, 'PHASE-01G-ROLLBACK-MANIFEST.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.writeFileSync(path.join(phaseOutput, 'PHASE-01G-ROLLBACK-MANIFEST.sha256'), `${sha256(manifestPath)}  PHASE-01G-ROLLBACK-MANIFEST.json\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`${JSON.stringify({ ...common, status: 'PHASE_01G_PRE_DEPLOY_BACKUP_PASS', oldRulesBackupSHA256: rulesChecksum, rollbackManifestSHA256: sha256(manifestPath) }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify({ ...common, status: match ? 'PHASE_01G_DEPLOYED_RULES_MATCH_LOCAL' : 'PHASE_01G_DEPLOYED_RULES_MISMATCH' }, null, 2)}\n`);
  if (!match) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`PHASE_01G_ABORTED: ${String(error.message || 'UNKNOWN').slice(0, 180)}\n`);
  process.exitCode = 1;
});
