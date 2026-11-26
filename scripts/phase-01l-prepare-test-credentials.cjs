const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const value = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : '';
};

const output = path.resolve(value('--output') || '');
const expectedSegment = `${path.sep}SENSITIVE-PRODUCTION-BACKUP${path.sep}my-project-51bb7${path.sep}`;

if (!output || !output.includes(expectedSegment) || path.extname(output).toLowerCase() !== '.json') {
  throw new Error('ABORT_UNSAFE_CREDENTIAL_OUTPUT');
}
if (fs.existsSync(output)) throw new Error('ABORT_CREDENTIAL_FILE_EXISTS');

const password = () => `${crypto.randomBytes(18).toString('base64url')}!aA7`;
const data = {
  projectId: 'my-project-51bb7',
  purpose: 'Phase 1L controlled Recruiter workflow test credentials',
  createdAt: new Date().toISOString(),
  recruiter01: {
    email: 'recruiter01-phase1l@academia-smart.test',
    password: password()
  },
  recruiter02: {
    email: 'recruiter02-phase1l@academia-smart.test',
    password: password()
  }
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
process.stdout.write(JSON.stringify({ created: true, containsTwoCredentials: true, outputInsideSensitiveBackup: true }));
