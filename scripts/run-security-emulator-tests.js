const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectId = 'demo-academia-smart-phase1a';

const javaMajor = command => {
  const result = spawnSync(command, ['-version'], { encoding: 'utf8', windowsHide: true });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const match = output.match(/version\s+"(?:1\.)?(\d+)/i);
  return result.status === 0 && match ? Number(match[1]) : 0;
};

const resolveJavaHome = () => {
  const configured = process.env.JAVA_HOME;
  if (configured && javaMajor(path.join(configured, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')) >= 11) {
    return configured;
  }
  if (javaMajor('java') >= 11) return configured || '';
  if (process.platform === 'win32') {
    const androidJbr = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    if (fs.existsSync(path.join(androidJbr, 'bin', 'java.exe')) && javaMajor(path.join(androidJbr, 'bin', 'java.exe')) >= 11) {
      return androidJbr;
    }
  }
  throw new Error('Firestore Emulator requires Java 11 or newer. Set JAVA_HOME to a local JDK.');
};

const javaHome = resolveJavaHome();
const firebaseBin = require.resolve('firebase-tools/lib/bin/firebase.js');
const testNamePattern = String(process.env.TEST_NAME_PATTERN || '').replace(/"/g, '\\"');
const patternArgument = testNamePattern ? ` --test-name-pattern="${testNamePattern}"` : '';
const nodeCommand = `"${process.execPath}" --test --test-concurrency=1${patternArgument} tests/security/emulator-security.test.js`;
const configHome = path.join(os.tmpdir(), 'academia-smart-firebase-config');
fs.mkdirSync(configHome, { recursive: true });

const env = {
  ...process.env,
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
  FIREBASE_EMULATORS_PATH: path.join(os.tmpdir(), 'academia-smart-firebase-emulators'),
  FIREBASE_PROJECT_ID: projectId,
  GCLOUD_PROJECT: projectId,
  GOOGLE_CLOUD_PROJECT: projectId,
  XDG_CONFIG_HOME: configHome
};
if (javaHome) {
  env.JAVA_HOME = javaHome;
  env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH || ''}`;
}

const result = spawnSync(process.execPath, [firebaseBin,
  'emulators:exec',
  '--only', 'auth,firestore',
  '--project', projectId,
  nodeCommand
], { env, stdio: 'inherit', windowsHide: true });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
