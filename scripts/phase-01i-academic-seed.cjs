#!/usr/bin/env node
'use strict';

/*
 * Phase 1I academic baseline executor.
 *
 * Safety contract:
 * - no mode means help (and no write);
 * - production execution is deliberately blocked until a separately approved
 *   release replaces the explicit allow-list below;
 * - execute/rollback require an explicit emulator target in this phase;
 * - only the 2/3/4/6 academic hierarchy is ever in scope.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { getFirebaseAdmin, hasEmulatorConfiguration } = require('../server/firebaseAdmin');

const PRODUCTION_PROJECT = 'my-project-51bb7';
const EXPECTED_COUNTS = Object.freeze({ universities: 2, colleges: 3, departments: 4, subjects: 6 });
const MANIFEST_DIR = path.join(__dirname, '..', 'local-manifests');
const MANIFEST_FILE = path.join(MANIFEST_DIR, 'phase-01i-seed-execution-manifest.json');

const plan = Object.freeze({
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
});

const args = process.argv.slice(2);
const selectedModes = ['--dry-run', '--execute', '--verify', '--rollback'].filter(flag => args.includes(flag));
const mode = selectedModes.length === 1 ? selectedModes[0].slice(2) : null;
const projectArgument = args.indexOf('--project');
const projectId = projectArgument >= 0 ? args[projectArgument + 1] : (process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || PRODUCTION_PROJECT);
const isEmulator = hasEmulatorConfiguration();

const help = () => {
  process.stdout.write([
    'Phase 1I Academic Seed Executor',
    '',
    'Usage:',
    '  node scripts/phase-01i-academic-seed.cjs --dry-run',
    '  node scripts/phase-01i-academic-seed.cjs --verify --project <projectId>',
    '  node scripts/phase-01i-academic-seed.cjs --execute --project <emulator-project>   # emulator only in Phase 1I',
    '  node scripts/phase-01i-academic-seed.cjs --rollback --project <emulator-project>  # manifest-bound, emulator only',
    '',
    'No mode writes no data. Production execute/rollback is intentionally blocked in Phase 1I.'
  ].join('\n') + '\n');
};

const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ar');
const countPlan = () => Object.values(EXPECTED_COUNTS).reduce((sum, count) => sum + count, 0);
const stablePlanChecksum = () => crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const output = value => process.stdout.write(`${JSON.stringify(value)}\n`);
const fail = code => { throw new Error(code); };

const assertArguments = () => {
  if (!mode) {
    help();
    return false;
  }
  if (selectedModes.length !== 1 || (projectArgument >= 0 && !projectId) || args.some(arg => ['--dry-run', '--execute', '--verify', '--rollback', '--project'].includes(arg) === false && !args.includes(projectId))) {
    fail('INVALID_ARGUMENTS');
  }
  return true;
};

const assertTargetSafety = () => {
  if (!projectId) fail('PROJECT_ID_REQUIRED');
  if ((mode === 'execute' || mode === 'rollback') && !isEmulator) {
    if (projectId === PRODUCTION_PROJECT) fail('PRODUCTION_EXECUTION_REQUIRES_SEPARATE_APPROVAL');
    fail('EXECUTE_REQUIRES_FIREBASE_EMULATOR');
  }
  if ((mode === 'execute' || mode === 'rollback') && projectId === PRODUCTION_PROJECT && !isEmulator) fail('PRODUCTION_TARGET_BLOCKED');
  if (mode === 'dry-run') output({ status: 'DRY_RUN_TARGET', projectId, productionWrites: 0 });
};

const readAll = async (db, collection) => {
  const snapshot = await db.collection(collection).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const countCollections = async db => {
  const entries = await Promise.all(Object.keys(EXPECTED_COUNTS).map(async collection => [collection, (await db.collection(collection).get()).size]));
  return Object.fromEntries(entries);
};

const assertSuperAdmin = async ({ db, auth }) => {
  const users = await readAll(db, 'users');
  if (users.length !== 1) fail('SEED_PRECHECK_BLOCKED_USERS_COUNT');
  const [profile] = users;
  const superAdmin = profile.role === 'admin' && (profile.adminLevel === 'super' || profile.isSuperAdmin === true || (!Object.hasOwn(profile, 'adminLevel') && !Array.isArray(profile.permissions)));
  if (!superAdmin) fail('SEED_PRECHECK_BLOCKED_SUPER_ADMIN_PROFILE');
  if (['blocked', 'suspended'].includes(profile.accountStatus)) fail('SEED_PRECHECK_BLOCKED_SUPER_ADMIN_BLOCKED');

  // The production precheck requires the matching Auth identity.  Phase 1I
  // deliberately creates no Auth users, including in the emulator fixture, so
  // only this one structural assertion is marked emulator-only in the test.
  if (isEmulator) return { id: profile.id, auth: 'EMULATOR_AUTH_NOT_CREATED_BY_PHASE_1I', protected: true };
  let authUser;
  try { authUser = await auth.getUser(profile.id); } catch { fail('SEED_PRECHECK_BLOCKED_SUPER_ADMIN_AUTH'); }
  if (authUser.disabled) fail('SEED_PRECHECK_BLOCKED_SUPER_ADMIN_AUTH_DISABLED');
  return { id: profile.id, auth: 'PRESENT_ENABLED', protected: true };
};

const isEmptyAcademicState = counts => Object.values(counts).every(count => count === 0);

const preflight = async (services, { allowCompletedPlan = false } = {}) => {
  if (projectId !== PRODUCTION_PROJECT && !isEmulator) fail('SEED_PRECHECK_BLOCKED_UNAPPROVED_PROJECT');
  const counts = await countCollections(services.db);
  const superAdmin = await assertSuperAdmin(services);
  const unexpected = Object.entries(counts).filter(([, count]) => count !== 0);
  const completePlannedCounts = Object.entries(EXPECTED_COUNTS).every(([collection, expected]) => counts[collection] === expected);
  if (!isEmptyAcademicState(counts) && !(allowCompletedPlan && completePlannedCounts)) {
    fail(`SEED_PRECHECK_BLOCKED_ACADEMIC_COUNTS_${unexpected.map(([collection, count]) => `${collection}:${count}`).join(',')}`);
  }
  return { projectId, counts, superAdmin, expectedUsers: 1, expectedAcademicCounts: { universities: 0, colleges: 0, departments: 0, subjects: 0 } };
};

const findByName = (records, name, parentField, parentId) => records.filter(record => normalize(record.name) === normalize(name) && (!parentField || record[parentField] === parentId));
const findByCode = (records, code) => records.filter(record => String(record.code || '').toUpperCase() === String(code).toUpperCase());

const planRows = () => [
  ...plan.universities.map(item => ({ collection: 'universities', ...item, dependency: null })),
  ...plan.colleges.map(item => ({ collection: 'colleges', ...item, dependency: item.university })),
  ...plan.departments.map(item => ({ collection: 'departments', ...item, dependency: item.college })),
  ...plan.subjects.map(item => ({ collection: 'subjects', ...item, dependency: item.department }))
];

const dryRun = () => {
  output({
    status: 'DRY_RUN_PASS',
    productionWrites: 0,
    projectId,
    dependencyOrder: ['universities', 'colleges', 'departments', 'subjects'],
    expectedTotal: countPlan(),
    plannedRecords: planRows().map(row => ({ collection: row.collection, alias: row.alias, name: row.name, parent: row.dependency || null, code: row.code || null, active: true })),
    duplicateLookup: 'normalized name + immediate parent ID; subject code conflict blocks execution',
    planChecksum: stablePlanChecksum()
  });
};

const createOrSkip = async ({ db, FieldValue }, collection, item, parentId, existing, created, skipped) => {
  const parentField = collection === 'colleges' ? 'universityId' : collection === 'departments' ? 'collegeId' : collection === 'subjects' ? 'departmentId' : null;
  const sameName = findByName(existing[collection], item.name, parentField, parentId);
  if (sameName.length > 1) fail(`SEED_PRECHECK_BLOCKED_DUPLICATE_${collection.toUpperCase()}_${item.alias}`);
  if (collection === 'subjects') {
    const sameCode = findByCode(existing.subjects, item.code);
    if (sameCode.some(record => !sameName.some(match => match.id === record.id))) fail(`SEED_PRECHECK_BLOCKED_SUBJECT_CODE_CONFLICT_${item.alias}`);
    if (sameName.length && String(sameName[0].code || '').toUpperCase() !== item.code) fail(`SEED_PRECHECK_BLOCKED_SUBJECT_CODE_MISMATCH_${item.alias}`);
  }
  if (sameName.length === 1) {
    skipped.push({ collection, alias: item.alias, id: sameName[0].id, reason: 'SKIP_EXISTING' });
    return sameName[0];
  }
  const data = { name: item.name, active: true, createdAt: FieldValue.serverTimestamp() };
  if (parentField) data[parentField] = parentId;
  if (collection === 'subjects') data.code = item.code;
  const ref = await db.collection(collection).add(data);
  const record = { id: ref.id, ...data };
  existing[collection].push(record);
  created.push({ collection, alias: item.alias, id: ref.id });
  return record;
};

const writeExecutionManifest = data => {
  fs.mkdirSync(MANIFEST_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
};

const readCompatibleManifest = () => {
  if (!fs.existsSync(MANIFEST_FILE)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    return manifest.projectId === projectId && manifest.emulator === isEmulator && manifest.planChecksum === stablePlanChecksum() ? manifest : null;
  } catch {
    return null;
  }
};

const execute = async services => {
  // An exactly complete prior batch is the only non-empty state accepted here.
  // It must resolve entirely to SKIP_EXISTING, otherwise a later check aborts.
  const pre = await preflight(services, { allowCompletedPlan: true });
  const existing = Object.fromEntries(await Promise.all(Object.keys(EXPECTED_COUNTS).map(async collection => [collection, await readAll(services.db, collection)])));
  const created = [];
  const skipped = [];
  const ids = {};
  for (const item of plan.universities) ids[item.alias] = await createOrSkip(services, 'universities', item, null, existing, created, skipped);
  for (const item of plan.colleges) ids[item.alias] = await createOrSkip(services, 'colleges', item, ids[item.university].id, existing, created, skipped);
  for (const item of plan.departments) ids[item.alias] = await createOrSkip(services, 'departments', item, ids[item.college].id, existing, created, skipped);
  for (const item of plan.subjects) ids[item.alias] = await createOrSkip(services, 'subjects', item, ids[item.department].id, existing, created, skipped);
  const priorManifest = readCompatibleManifest();
  const createdByCollection = Object.fromEntries(Object.keys(EXPECTED_COUNTS).map(collection => [collection, created.filter(item => item.collection === collection)]));
  // A re-run must not replace the original rollback inventory with an empty
  // SKIP_EXISTING result.  Keep the first manifest's IDs when this invocation
  // created nothing; rollback remains bound to those exact IDs only.
  const rollbackCreated = created.length === 0 && priorManifest ? priorManifest.created : createdByCollection;
  const manifest = {
    schemaVersion: 1,
    seedBatchId: `phase-01i-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    projectId,
    emulator: isEmulator,
    timestamp: new Date().toISOString(),
    planChecksum: stablePlanChecksum(),
    created: rollbackCreated,
    skippedExisting: skipped,
    lastRunCreated: createdByCollection,
    preflight: pre
  };
  writeExecutionManifest(manifest);
  output({ status: 'SEED_EXECUTE_PASS', projectId, emulator: isEmulator, created: created.length, skippedExisting: skipped.length, manifestPath: MANIFEST_FILE, productionWrites: 0 });
};

const verify = async ({ db }) => {
  const all = Object.fromEntries(await Promise.all(Object.keys(EXPECTED_COUNTS).map(async collection => [collection, await readAll(db, collection)])));
  for (const [collection, expected] of Object.entries(EXPECTED_COUNTS)) if (all[collection].length !== expected) fail(`VERIFY_COUNT_MISMATCH_${collection.toUpperCase()}_${all[collection].length}`);
  const universityNames = new Set();
  for (const university of all.universities) {
    const key = normalize(university.name);
    if (universityNames.has(key) || university.active !== true) fail('VERIFY_UNIVERSITY_DUPLICATE_OR_INACTIVE');
    universityNames.add(key);
  }
  const assertChildren = (children, parents, field, label) => {
    const seen = new Set();
    for (const child of children) {
      if (!parents.some(parent => parent.id === child[field]) || child.active !== true) fail(`VERIFY_${label}_ORPHAN_OR_INACTIVE`);
      const key = `${child[field]}:${normalize(child.name)}`;
      if (seen.has(key)) fail(`VERIFY_${label}_DUPLICATE_NAME`);
      seen.add(key);
    }
  };
  assertChildren(all.colleges, all.universities, 'universityId', 'COLLEGE');
  assertChildren(all.departments, all.colleges, 'collegeId', 'DEPARTMENT');
  assertChildren(all.subjects, all.departments, 'departmentId', 'SUBJECT');
  const codes = new Set();
  for (const subject of all.subjects) {
    if (!subject.code || codes.has(String(subject.code).toUpperCase())) fail('VERIFY_SUBJECT_CODE_DUPLICATE_OR_MISSING');
    codes.add(String(subject.code).toUpperCase());
  }
  for (const item of plan.subjects) {
    const found = all.subjects.find(subject => normalize(subject.name) === normalize(item.name));
    if (!found || found.code !== item.code) fail(`VERIFY_SUBJECT_PLAN_MISMATCH_${item.alias}`);
  }
  output({ status: 'VERIFY_PASS', projectId, counts: Object.fromEntries(Object.entries(all).map(([collection, records]) => [collection, records.length])), noOrphans: true, noDuplicateSeedRecords: true, active: true, subjectCodes: 'PASS', productionWrites: 0 });
};

const rollback = async ({ db }) => {
  if (!fs.existsSync(MANIFEST_FILE)) fail('ROLLBACK_MANIFEST_NOT_FOUND');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  if (manifest.projectId !== projectId || manifest.emulator !== true || !isEmulator || manifest.planChecksum !== stablePlanChecksum()) fail('ROLLBACK_MANIFEST_TARGET_OR_CHECKSUM_MISMATCH');
  const order = ['subjects', 'departments', 'colleges', 'universities'];
  let deleted = 0;
  for (const collection of order) {
    for (const item of manifest.created?.[collection] || []) {
      const ref = db.collection(collection).doc(item.id);
      const snapshot = await ref.get();
      if (!snapshot.exists) continue;
      await ref.delete();
      deleted++;
    }
  }
  output({ status: 'ROLLBACK_PASS', projectId, emulator: true, deleted, manifestBound: true, productionWrites: 0 });
};

async function main() {
  if (!assertArguments()) return;
  assertTargetSafety();
  if (mode === 'dry-run') return dryRun();
  const services = getFirebaseAdmin();
  if (mode === 'execute') return execute(services);
  if (mode === 'verify') return verify(services);
  return rollback(services);
}

main().catch(error => {
  output({ status: mode === 'verify' ? 'VERIFY_FAILED' : 'SEED_PRECHECK_BLOCKED', projectId: projectId || null, mode: mode || 'help', errorCode: String(error.message || 'UNKNOWN').slice(0, 180), productionWrites: 0 });
  process.exitCode = 1;
});
