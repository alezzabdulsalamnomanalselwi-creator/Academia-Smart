const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

let cachedServices = null;

const hasEmulatorConfiguration = () => Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST
);

const hasAdminCredentialConfiguration = () => Boolean(
  hasEmulatorConfiguration()
  || process.env.GOOGLE_APPLICATION_CREDENTIALS
  || process.env.FIREBASE_CONFIG
  || process.env.GOOGLE_CLOUD_PROJECT
);

const getFirebaseAdmin = () => {
  if (cachedServices) return cachedServices;

  const projectId = process.env.FIREBASE_PROJECT_ID
    || process.env.REACT_APP_FIREBASE_PROJECT_ID
    || process.env.GOOGLE_CLOUD_PROJECT;
  const options = projectId ? { projectId } : {};

  // Emulator connections do not need production credentials. Everywhere else
  // Application Default Credentials are used; service-account JSON never
  // belongs in React or in this repository.
  if (!hasEmulatorConfiguration()) options.credential = applicationDefault();

  const app = getApps().find(item => item.name === 'academia-smart-server')
    || initializeApp(options, 'academia-smart-server');

  cachedServices = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    FieldValue
  };
  return cachedServices;
};

module.exports = {
  getFirebaseAdmin,
  hasAdminCredentialConfiguration,
  hasEmulatorConfiguration
};
