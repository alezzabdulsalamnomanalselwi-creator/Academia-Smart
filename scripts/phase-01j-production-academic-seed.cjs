#!/usr/bin/env node
'use strict';

// Phase 1J: deliberately narrow Production adapter for the Phase 1I plan.
// It never touches Auth, users, rules, or non-academic collections.  The one
// execute operation is an atomic Firestore commit with exists:false guards.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT = 'my-project-51bb7';
const ACADEMIC = ['universities', 'colleges', 'departments', 'subjects'];
const NON_ACADEMIC_ZERO = ['adminNotifications', 'applications', 'auditLogs', 'documents', 'interviews', 'jobs', 'notifications', 'positions', 'ratings', 'recruiterInterest', 'recruiterInterests', 'recruiterRequests', 'savedJobs', 'verifications'];
const EXPECTED = { universities: 2, colleges: 3, departments: 4, subjects: 6 };
const MANIFEST_DIR = path.join(__dirname, '..', 'local-manifests');
const MANIFEST_FILE = path.join(MANIFEST_DIR, 'phase-01j-production-seed-execution-manifest.json');
const ROOT = path.join(__dirname, '..');

const plan = {
  universities: [
    { alias: 'U1', name: 'جامعة الاختبار التقنية' },
    { alias: 'U2', name: 'جامعة الأكاديمية النموذجية' }
  ],
  colleges: [
    { alias: 'C1', name: 'كلية الحوسبة', university: 'U1' },
    { alias: 'C2', name: 'كلية الهندسة', university: 'U1' },
    { alias: 'C3', name: 'كلية العلوم التطبيقية', university: 'U2' }
  ],
  departments: [
    { alias: 'D1', name: 'تقنية المعلومات', college: 'C1' },
    { alias: 'D2', name: 'الذكاء الاصطناعي', college: 'C1' },
    { alias: 'D3', name: 'الهندسة الكهربائية', college: 'C2' },
    { alias: 'D4', name: 'علوم الحاسوب', college: 'C3' }
  ],
  subjects: [
    { alias: 'S1', name: 'نظم قواعد البيانات', code: 'IT101', department: 'D1' },
    { alias: 'S2', name: 'تطوير تطبيقات الويب', code: 'IT102', department: 'D1' },
    { alias: 'S3', name: 'أساسيات الذكاء الاصطناعي', code: 'AI101', department: 'D2' },
    { alias: 'S4', name: 'تعلم الآلة', code: 'AI102', department: 'D2' },
    { alias: 'S5', name: 'تحليل الدوائر الكهربائية', code: 'SUB101', department: 'D3' },
    { alias: 'S6', name: 'مبادئ البرمجة', code: 'CS101', department: 'D4' }
  ]
};

const args = process.argv.slice(2);
const mode = ['--dry-run', '--execute', '--verify'].filter(flag => args.includes(flag));
const value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
const projectId = value('--project');
const account = value('--account');
const checkpoint = value('--checkpoint');
const backupRoot = value('--backup-root');
const normalize = text => String(text || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar');
const checksum = () => crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const emit = payload => process.stdout.write(`${JSON.stringify(payload)}\n`);
const abort = code => { throw new Error(code); };

function help() {
  process.stdout.write('Usage: node scripts/phase-01j-production-academic-seed.cjs --dry-run|--execute|--verify --project my-project-51bb7 --account <registered-cli-email> --checkpoint <local-zip> --backup-root <sensitive-backup>\n');
}

function assertArgs() {
  if (mode.length !== 1 || projectId !== PROJECT || !account || !checkpoint || !backupRoot) abort('ABORT_INVALID_OR_INCOMPLETE_ARGUMENTS');
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) abort('ABORT_EMULATOR_TARGETING_ACTIVE');
  if (!fs.existsSync(checkpoint)) abort('ABORT_CHECKPOINT_MISSING');
  const manifest = path.join(backupRoot, 'BACKUP-MANIFEST.json');
  const sidecar = path.join(backupRoot, 'BACKUP-MANIFEST.sha256');
  if (!fs.existsSync(manifest) || !fs.existsSync(sidecar)) abort('ABORT_SENSITIVE_BACKUP_MISSING');
  const expectedHash = fs.readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0].toUpperCase();
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(manifest)).digest('hex').toUpperCase();
  if (expectedHash !== actualHash) abort('ABORT_SENSITIVE_BACKUP_MANIFEST_CHECKSUM');
}

async function token() {
  const cliAuth = require(path.join(ROOT, 'node_modules/firebase-tools/lib/auth'));
  const { requireAuth } = require(path.join(ROOT, 'node_modules/firebase-tools/lib/requireAuth'));
  const registered = cliAuth.getAllAccounts().find(item => item?.user?.email === account);
  if (!registered) abort('ABORT_FIREBASE_CLI_ACCOUNT_NOT_REGISTERED');
  const options = { project: PROJECT, account };
  cliAuth.setActiveAccount(options, registered);
  await requireAuth(options);
  const refreshed = await cliAuth.getAccessToken(options.tokens.refresh_token, options.authScopes);
  if (!refreshed?.access_token) abort('ABORT_ACCESS_TOKEN_UNAVAILABLE');
  return refreshed.access_token;
}

async function request(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = String(body?.error?.message || '').replace(/[\r\n]+/g, ' ').slice(0, 180);
    abort(`ABORT_HTTP_${response.status}_${body?.error?.status || 'ERROR'}${detail ? `_${detail}` : ''}`);
  }
  return body;
}

const base = () => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents`;
const documentBase = () => `projects/${PROJECT}/databases/(default)/documents`;
async function listCollection(accessToken, collection) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await request(`${base()}/${encodeURIComponent(collection)}?${query}`, accessToken);
    documents.push(...(response.documents || []));
    pageToken = response.nextPageToken || '';
  } while (pageToken);
  return documents;
}

const decode = field => field?.stringValue ?? field?.booleanValue ?? field?.integerValue ?? field?.doubleValue ?? field?.timestampValue ?? null;
const record = document => ({ id: String(document.name || '').split('/').pop(), ...Object.fromEntries(Object.entries(document.fields || {}).map(([key, field]) => [key, decode(field)])) });
const field = value => typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) };

async function authUsers(accessToken) {
  const response = await request(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/accounts:batchGet?maxResults=1000`, accessToken);
  return response.users || [];
}

async function rulesMatch(accessToken) {
  const release = await request(`https://firebaserules.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/releases/cloud.firestore`, accessToken);
  const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, accessToken);
  const active = ruleset.source?.files?.[0]?.content;
  const local = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  return typeof active === 'string' && active.replace(/\r\n/g, '\n').trimEnd() === local.replace(/\r\n/g, '\n').trimEnd();
}

async function state(accessToken) {
  const names = [...new Set(['users', 'adminLogs', ...ACADEMIC, ...NON_ACADEMIC_ZERO])];
  const entries = await Promise.all(names.map(async name => [name, (await listCollection(accessToken, name)).map(record)]));
  const collections = Object.fromEntries(entries);
  const auth = await authUsers(accessToken);
  return { collections, auth, rulesMatch: await rulesMatch(accessToken) };
}

function assertSafety(current, { allowSeeded = false } = {}) {
  if (!current.rulesMatch) abort('ABORT_DEPLOYED_RULES_MISMATCH');
  const users = current.collections.users;
  if (users.length !== 1 || current.auth.length !== 1) abort('ABORT_SUPER_ADMIN_COUNT');
  const admin = users[0];
  const auth = current.auth[0];
  if (admin.id !== auth.localId || auth.disabled || admin.role !== 'admin' || admin.adminLevel !== 'super' || ['blocked', 'suspended', 'disabled'].includes(String(admin.accountStatus || '').toLowerCase())) abort('ABORT_SUPER_ADMIN_ASSERTION');
  for (const name of NON_ACADEMIC_ZERO) if (current.collections[name].length !== 0) abort(`ABORT_NON_ACADEMIC_COUNT_${name}`);
  if (current.collections.adminLogs.length < 86) abort('ABORT_ADMIN_LOG_COUNT');
  for (const name of ACADEMIC) {
    const count = current.collections[name].length;
    if (allowSeeded ? count !== EXPECTED[name] : count !== 0) abort(`ABORT_ACADEMIC_COUNT_${name}_${count}`);
  }
}

function validateAcademic(current) {
  const all = current.collections;
  for (const name of ACADEMIC) if (all[name].length !== EXPECTED[name]) abort(`VERIFY_COUNT_MISMATCH_${name.toUpperCase()}`);
  for (const university of all.universities) if (university.active !== true) abort('VERIFY_UNIVERSITY_INACTIVE');
  const names = new Set();
  for (const university of all.universities) { const key = normalize(university.name); if (names.has(key)) abort('VERIFY_UNIVERSITY_DUPLICATE'); names.add(key); }
  const children = (childName, parentName, parentField) => {
    const seen = new Set();
    for (const child of all[childName]) {
      if (child.active !== true || !all[parentName].some(parent => parent.id === child[parentField])) abort(`VERIFY_${childName.toUpperCase()}_ORPHAN_OR_INACTIVE`);
      const key = `${child[parentField]}:${normalize(child.name)}`; if (seen.has(key)) abort(`VERIFY_${childName.toUpperCase()}_DUPLICATE`); seen.add(key);
    }
  };
  children('colleges', 'universities', 'universityId'); children('departments', 'colleges', 'collegeId'); children('subjects', 'departments', 'departmentId');
  const codes = new Set();
  for (const subject of all.subjects) { const code = String(subject.code || '').toUpperCase(); if (!code || codes.has(code)) abort('VERIFY_SUBJECT_CODE_DUPLICATE_OR_MISSING'); codes.add(code); }
  for (const item of plan.subjects) if (!all.subjects.some(subject => normalize(subject.name) === normalize(item.name) && subject.code === item.code)) abort(`VERIFY_SUBJECT_PLAN_MISMATCH_${item.alias}`);
}

function plannedWrites() {
  const ids = Object.fromEntries([...plan.universities, ...plan.colleges, ...plan.departments, ...plan.subjects].map(item => [item.alias, crypto.randomUUID().replace(/-/g, '')]));
  const make = (collection, item, parentField, parentAlias) => {
    const fields = { name: field(item.name), active: field(true) };
    if (parentField) fields[parentField] = field(ids[parentAlias]);
    if (item.code) fields.code = field(item.code);
    return { update: { name: `${documentBase()}/${collection}/${ids[item.alias]}`, fields }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }] };
  };
  const writes = [
    ...plan.universities.map(item => make('universities', item)),
    ...plan.colleges.map(item => make('colleges', item, 'universityId', item.university)),
    ...plan.departments.map(item => make('departments', item, 'collegeId', item.college)),
    ...plan.subjects.map(item => make('subjects', item, 'departmentId', item.department))
  ];
  const created = Object.fromEntries(ACADEMIC.map(collection => [collection, Object.entries(ids).filter(([alias]) => plan[collection].some(item => item.alias === alias)).map(([alias, id]) => ({ collection, alias, id }))]));
  return { writes, created };
}

function writeManifest(created, preAdminLogs) {
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  const data = { schemaVersion: 1, seedBatchId: `phase-01j-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`, projectId: PROJECT, timestamp: new Date().toISOString(), planChecksum: checksum(), created, skippedExisting: [], createdCount: 15, preAdminLogs };
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  return data;
}

async function dryRun(accessToken) {
  const current = await state(accessToken);
  const empty = ACADEMIC.every(name => current.collections[name].length === 0);
  if (empty) {
    assertSafety(current);
    emit({ status: 'DRY_RUN_PASS', projectId: PROJECT, plannedNew: 15, skippedExisting: 0, dependencyOrder: ACADEMIC, rulesMatch: true, productionWrites: 0 });
    return;
  }
  assertSafety(current, { allowSeeded: true }); validateAcademic(current);
  emit({ status: 'DRY_RUN_PASS', projectId: PROJECT, plannedNew: 0, skippedExisting: 15, dependencyOrder: ACADEMIC, rulesMatch: true, productionWrites: 0 });
}

async function execute(accessToken) {
  const before = await state(accessToken); assertSafety(before);
  const { writes, created } = plannedWrites();
  if (writes.length !== 15) abort('ABORT_PLAN_WRITE_COUNT');
  await request(`${base()}:commit`, accessToken, { method: 'POST', body: JSON.stringify({ writes }) });
  const manifest = writeManifest(created, before.collections.adminLogs.length);
  emit({ status: 'SEED_EXECUTE_PASS', projectId: PROJECT, atomic: true, created: 15, skippedExisting: 0, manifestPath: MANIFEST_FILE, seedBatchId: manifest.seedBatchId, productionWrites: 15 });
}

async function verify(accessToken) {
  const after = await state(accessToken); assertSafety(after, { allowSeeded: true }); validateAcademic(after);
  emit({ status: 'VERIFY_PASS', projectId: PROJECT, counts: Object.fromEntries(ACADEMIC.map(name => [name, after.collections[name].length])), total: 15, noOrphans: true, noDuplicateSeedRecords: true, active: true, subjectCodes: 'PASS', superAdminPreserved: true, firestoreUsers: 1, unexpectedNonAcademicWrites: 0, productionWrites: 0 });
}

async function main() {
  if (args.length === 0) return help();
  assertArgs();
  const accessToken = await token();
  if (mode[0] === '--dry-run') return dryRun(accessToken);
  if (mode[0] === '--execute') return execute(accessToken);
  return verify(accessToken);
}

main().catch(error => { emit({ status: mode[0] === '--verify' ? 'VERIFY_FAILED' : 'SEED_PRECHECK_BLOCKED', projectId: projectId || null, errorCode: String(error.message || 'UNKNOWN').slice(0, 180), productionWrites: 0 }); process.exitCode = 1; });
