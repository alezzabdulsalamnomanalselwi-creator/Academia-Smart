const path = require('node:path');

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) {
      throw new Error('INVALID_ARGUMENTS');
    }
    result[argv[index].slice(2)] = argv[index + 1];
  }
  return result;
}

function denied(error) {
  return error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied';
}

async function expectDenied(name, operation) {
  try {
    await operation();
    return { name, denied: false, result: 'UNEXPECTEDLY_ALLOWED' };
  } catch (error) {
    return {
      name,
      denied: denied(error),
      result: denied(error) ? 'DENIED' : 'UNEXPECTED_ERROR',
      errorCode: String(error?.code || 'unknown').slice(0, 80)
    };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const expectedProject = args.project;
  const projectRoot = path.resolve(args['project-root'] || '.');
  if (expectedProject !== 'my-project-51bb7') throw new Error('ABORT_UNEXPECTED_PROJECT');
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('ABORT_EMULATOR_TARGETING_ACTIVE');
  }

  require('dotenv').config({ path: path.join(projectRoot, '.env'), quiet: true });
  if (process.env.REACT_APP_FIREBASE_PROJECT_ID !== expectedProject) {
    throw new Error('ABORT_ENV_PROJECT_MISMATCH');
  }

  const { initializeApp, deleteApp } = require('firebase/app');
  const { getFirestore, collection, doc, getDocs, deleteDoc } = require('firebase/firestore');
  const app = initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  }, 'phase-01g-anonymous-production-check');
  const db = getFirestore(app);

  const results = [];
  results.push(await expectDenied('anonymous_read_users', () => getDocs(collection(db, 'users'))));
  results.push(await expectDenied('anonymous_read_admin_logs', () => getDocs(collection(db, 'adminLogs'))));
  results.push(await expectDenied('anonymous_read_arbitrary_collection', () => getDocs(collection(db, 'phase01gArbitraryReadProbe'))));
  // Deleting a guaranteed-nonexistent sentinel exercises write authorization without creating test data.
  results.push(await expectDenied('anonymous_write_arbitrary_document', () => deleteDoc(doc(db, 'phase01gArbitraryWriteProbe', 'nonexistent-sentinel'))));

  await deleteApp(app);
  const passed = results.every((item) => item.denied);
  process.stdout.write(`${JSON.stringify({
    projectId: expectedProject,
    authenticated: false,
    emulatorTargetingActive: false,
    valuesPrinted: false,
    results,
    publicFirestoreRead: results.slice(0, 3).every((item) => item.denied) ? 'DENIED' : 'FAILED',
    publicFirestoreWrite: results[3].denied ? 'DENIED' : 'FAILED',
    status: passed ? 'PHASE_01G_ANONYMOUS_ACCESS_TESTS_PASS' : 'PHASE_01G_ANONYMOUS_ACCESS_TESTS_FAIL'
  }, null, 2)}\n`);
  if (!passed) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`PHASE_01G_ACCESS_TEST_ABORTED: ${String(error?.message || 'UNKNOWN').slice(0, 160)}\n`);
  process.exitCode = 1;
});
