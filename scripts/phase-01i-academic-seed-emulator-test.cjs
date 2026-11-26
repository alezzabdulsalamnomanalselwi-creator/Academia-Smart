#!/usr/bin/env node
'use strict';

// Local-only Phase 1I integration test. It deliberately creates no Auth user.
// The emulator fixture has one protected Firestore Super Admin profile so the
// executor can prove its structural preflight without altering Firebase Auth.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc } = require('firebase/firestore');
const { getFirebaseAdmin } = require('../server/firebaseAdmin');

const projectId = 'demo-academia-smart-phase1i';
const root = path.join(__dirname, '..');
const executor = path.join(__dirname, 'phase-01i-academic-seed.cjs');
const manifest = path.join(root, 'local-manifests', 'phase-01i-seed-execution-manifest.json');
const emit = payload => process.stdout.write(`${JSON.stringify(payload)}\n`);

const run = args => {
  const result = spawnSync(process.execPath, [executor, ...args], { env: { ...process.env, FIREBASE_PROJECT_ID: projectId, GCLOUD_PROJECT: projectId, GOOGLE_CLOUD_PROJECT: projectId }, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`EMULATOR_EXECUTOR_FAILED:${result.stdout || result.stderr}`);
  return result.stdout.trim();
};

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('EMULATOR_ENV_REQUIRED');
  if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
  const { db } = getFirebaseAdmin();
  await db.collection('users').doc('phase-01i-emulator-super-admin').set({ role: 'admin', adminLevel: 'super', accountStatus: 'active', isSuperAdmin: true });
  const dryRun = run(['--dry-run', '--project', projectId]);
  emit({ stage: 'DRY_RUN', result: 'PASS' });
  const first = run(['--execute', '--project', projectId]);
  emit({ stage: 'FIRST_EXECUTE', created: 15 });
  const verify = run(['--verify', '--project', projectId]);
  emit({ stage: 'VERIFY', result: 'PASS' });
  const second = run(['--execute', '--project', projectId]);
  emit({ stage: 'SECOND_EXECUTE', created: 0, skippedExisting: 15 });
  // This unrelated local-only record proves rollback stays strictly confined to
  // manifest IDs and never broad-deletes non-seed collections.
  const externalRef = db.collection('adminLogs').doc('phase-01i-external-retention-check');
  await externalRef.set({ action: 'emulator_retention_check' });
  const rollback = run(['--rollback', '--project', projectId]);
  const afterRollback = await Promise.all(['universities', 'colleges', 'departments', 'subjects'].map(async collection => [collection, (await db.collection(collection).get()).size]));
  const externalRetained = (await externalRef.get()).exists;
  emit({ stage: 'ROLLBACK', result: 'PASS', academicRecordsAfterRollback: 0, outsideManifestRecordRetained: externalRetained });
  const reseed = run(['--execute', '--project', projectId]);
  const reverify = run(['--verify', '--project', projectId]);
  emit({ stage: 'RESEED_AND_VERIFY', created: 15, result: 'PASS' });
  const authUsers = await getFirebaseAdmin().auth.listUsers();
  if (authUsers.users.length !== 0) throw new Error('EMULATOR_AUTH_USER_UNEXPECTED');
  const emptyAfterRollback = Object.values(Object.fromEntries(afterRollback)).every(count => count === 0);
  if (!dryRun.includes('DRY_RUN_PASS') || !first.includes('"created":15') || !verify.includes('VERIFY_PASS') || !second.includes('"created":0') || !second.includes('"skippedExisting":15') || !rollback.includes('ROLLBACK_PASS') || !emptyAfterRollback || !externalRetained || !reseed.includes('"created":15') || !reverify.includes('VERIFY_PASS')) throw new Error('EMULATOR_ASSERTION_FAILED');

  const [host, port = '8080'] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  const testEnv = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules } });
  try {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'users', 'phase-01i-rules-super-admin'), { role: 'admin', adminLevel: 'super', accountStatus: 'active', isSuperAdmin: true });
    });
    const rulesDb = testEnv.authenticatedContext('phase-01i-rules-super-admin').firestore();
    await assertSucceeds(setDoc(doc(rulesDb, 'universities', 'rules-u1'), { name: 'جامعة قواعد محلية', active: true }));
    await assertSucceeds(setDoc(doc(rulesDb, 'colleges', 'rules-c1'), { name: 'كلية قواعد محلية', universityId: 'rules-u1', active: true }));
    await assertSucceeds(setDoc(doc(rulesDb, 'departments', 'rules-d1'), { name: 'قسم قواعد محلي', collegeId: 'rules-c1', active: true }));
    await assertSucceeds(setDoc(doc(rulesDb, 'subjects', 'rules-s1'), { name: 'مادة قواعد محلية', departmentId: 'rules-d1', code: 'SUB901', active: true }));
  } finally {
    await testEnv.cleanup();
  }
  if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
  process.stdout.write(JSON.stringify({ status: 'PHASE_01I_EMULATOR_PASS', dryRun: 'PASS', execute: 'PASS', verify: 'PASS', secondExecute: 'SKIP_EXISTING_15', rollback: 'PASS', rollbackOutsideManifestRetention: 'PASS', reseed: 'PASS', rulesCompatibility: 'PASS', authUsersCreated: 0 }) + '\n');
}

main().catch(error => { process.stderr.write(`PHASE_01I_EMULATOR_FAILED:${error.message}\n`); process.exitCode = 1; });
