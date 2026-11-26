const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ID = 'my-project-51bb7';
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};
const projectRoot = path.resolve(valueAfter('--project-root') || '.');
const outputRoot = path.resolve(valueAfter('--output'));
const accountEmail = valueAfter('--account');
if (!outputRoot.includes(`${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}${PROJECT_ID}${path.sep}`)) throw new Error('INVALID_SENSITIVE_OUTPUT');
if (!accountEmail) throw new Error('ACCOUNT_REQUIRED');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('EMULATOR_TARGETING_ACTIVE');

const cliAuth = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/auth'));
const { requireAuth } = require(path.join(projectRoot, 'node_modules/firebase-tools/lib/requireAuth'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const normalized = value => String(value).replace(/\r\n/g, '\n').trimEnd() + '\n';

const fetchJson = async (url, token) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`HTTP_${response.status}_${body?.error?.status || 'ERROR'}`);
  return body;
};

(async () => {
  const account = cliAuth.getAllAccounts().find(item => item?.user?.email === accountEmail);
  if (!account) throw new Error('CLI_ACCOUNT_NOT_FOUND');
  const options = { project: PROJECT_ID, account: accountEmail };
  cliAuth.setActiveAccount(options, account);
  await requireAuth(options);
  const refreshed = await cliAuth.getAccessToken(options.tokens.refresh_token, options.authScopes);
  if (!refreshed?.access_token) throw new Error('ACCESS_TOKEN_UNAVAILABLE');
  const release = await fetchJson(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`, refreshed.access_token);
  const ruleset = await fetchJson(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, refreshed.access_token);
  const source = ruleset.source?.files?.[0]?.content;
  if (typeof source !== 'string') throw new Error('ACTIVE_RULES_SOURCE_MISSING');
  if (fs.existsSync(outputRoot) && fs.readdirSync(outputRoot).length) throw new Error('OUTPUT_NOT_EMPTY');
  fs.mkdirSync(outputRoot, { recursive: true });
  const rulesFile = path.join(outputRoot, 'firestore.rules.production-before-phase01q.rules');
  fs.writeFileSync(rulesFile, source, { encoding: 'utf8', flag: 'wx' });
  const local = fs.readFileSync(path.join(projectRoot, 'firestore.rules'), 'utf8');
  const manifest = {
    projectId: PROJECT_ID,
    capturedAt: new Date().toISOString(),
    releaseName: release.name,
    rulesetName: release.rulesetName,
    rollbackFile: path.basename(rulesFile),
    rollbackSHA256: hash(Buffer.from(source)),
    localCandidateSHA256: hash(Buffer.from(local)),
    activeAlreadyMatchesLocal: normalized(source) === normalized(local)
  };
  const manifestFile = path.join(outputRoot, 'PHASE-01Q-RULES-ROLLBACK-MANIFEST.json');
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  fs.writeFileSync(path.join(outputRoot, 'PHASE-01Q-RULES-ROLLBACK-MANIFEST.sha256'), `${hash(fs.readFileSync(manifestFile))}  ${path.basename(manifestFile)}\n`, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ status: 'PASS', projectId: PROJECT_ID, rollbackSHA256: manifest.rollbackSHA256, localCandidateSHA256: manifest.localCandidateSHA256, activeAlreadyMatchesLocal: manifest.activeAlreadyMatchesLocal }, null, 2)}\n`);
})().catch(error => {
  process.stderr.write(`PHASE_01Q_RULES_BACKUP_FAILED:${error.message}\n`);
  process.exitCode = 1;
});
