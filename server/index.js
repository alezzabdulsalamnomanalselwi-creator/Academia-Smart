const path = require('path');

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(path.resolve(__dirname, '..', '.env')); } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('[ENV_LOAD_FAILED]', error?.code || 'UNKNOWN');
  }
}

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { getFirebaseAdmin, hasAdminCredentialConfiguration } = require('./firebaseAdmin');
const {
  hasAllowedSignature,
  hasPermission,
  isExtensionAllowed,
  isSuperAdmin,
  normalizeEmail,
  resolvePathWithinRoot,
  safeOriginalName,
  sanitizeSegment
} = require('./security');
const {
  normalizeRatingInput,
  ratingDocumentId,
  ratingRequestId,
  ratingResultNotificationId,
  validateRatingRelations
} = require('./ratingWorkflow');

const app = express();
const PORT = Number(process.env.FILE_API_PORT || 5050);
const uploadsRoot = path.resolve(process.env.FILE_UPLOAD_DIR || path.join(__dirname, 'uploads'));
const maxMb = Math.max(1, Math.min(25, Number(process.env.FILE_MAX_MB || 25)));
const production = process.env.NODE_ENV === 'production';
fs.mkdirSync(uploadsRoot, { recursive: true });

const sendError = (res, status, code, message) => res.status(status).json({ ok: false, code, message });
const safeLog = (code, error) => console.error(`[${code}]`, error?.code || error?.name || 'ERROR');

const configuredOrigins = new Set(String(process.env.FILE_API_ALLOWED_ORIGINS || '')
  .split(',').map(value => value.trim()).filter(Boolean));
const allowLocalhost = !production && process.env.FILE_API_ALLOW_LOCALHOST !== 'false';
const originAllowed = origin => !origin
  || configuredOrigins.has(origin)
  || (allowLocalhost && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

app.use(cors({
  origin(origin, callback) {
    if (originAllowed(origin)) return callback(null, true);
    const error = new Error('CORS_ORIGIN_DENIED');
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  credentials: false,
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Document-Id']
}));
app.use(express.json({ limit: '1mb' }));

const rateBuckets = new Map();
const rateLimit = ({ windowMs, max, key }) => (req, res, next) => {
  const bucketKey = `${key}:${req.authUser?.uid || req.ip}`;
  const now = Date.now();
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return next();
  }
  current.count += 1;
  if (current.count > max) return sendError(res, 429, 'RATE_LIMITED', 'طلبات كثيرة جدًا. حاول مرة أخرى لاحقًا.');
  return next();
};

const loadActor = async uid => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection('users').doc(uid).get();
  return snapshot.exists ? { id: uid, ...snapshot.data() } : null;
};

const requireAuth = async (req, res, next) => {
  const match = String(req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return sendError(res, 401, 'AUTH_REQUIRED', 'يلزم تسجيل الدخول للوصول إلى هذه الخدمة.');

  let decoded;
  try {
    const { auth } = getFirebaseAdmin();
    decoded = await auth.verifyIdToken(match[1], true);
  } catch (error) {
    safeLog('AUTH_REJECTED', error);
    return sendError(res, 401, 'INVALID_TOKEN', 'جلسة الدخول غير صالحة أو منتهية.');
  }

  let actor;
  try {
    actor = await loadActor(decoded.uid);
  } catch (error) {
    safeLog('AUTH_PROFILE_LOOKUP_FAILED', error);
    return sendError(res, 503, 'AUTH_SERVICE_UNAVAILABLE', 'تعذر التحقق من بيانات الحساب. تحقق من إعداد خدمة Firebase Admin.');
  }
  if (!actor) return sendError(res, 403, 'PROFILE_REQUIRED', 'ملف المستخدم غير موجود.');
  if (['blocked', 'suspended'].includes(actor.accountStatus)) {
    return sendError(res, 403, 'ACCOUNT_DISABLED', 'الحساب محظور أو موقوف.');
  }
  req.authUser = decoded;
  req.actor = actor;
  return next();
};

const requirePermission = permission => (req, res, next) => {
  if (!hasPermission(req.actor, permission)) {
    return sendError(res, 403, 'PERMISSION_DENIED', 'ليست لديك صلاحية تنفيذ هذه العملية.');
  }
  return next();
};

const adminLogId = (action, target) => `${action}_${String(target).replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 180);
const adminLogData = (action, target, actor, details = {}) => ({
  action,
  target,
  details: JSON.stringify(details),
  adminId: actor.id,
  adminEmail: actor.email || '',
  adminName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
  createdAt: getFirebaseAdmin().FieldValue.serverTimestamp(),
  trustedWriter: 'local-file-api'
});

const validRecruiterRequest = body => {
  const email = normalizeEmail(body.email);
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const password = String(body.password || '');
  const universityId = String(body.universityId || '').trim();
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) return { error: 'INVALID_NAME' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'INVALID_EMAIL' };
  if (password.length < 6 || password.length > 128) return { error: 'INVALID_PASSWORD' };
  if (!universityId || universityId.length > 160) return { error: 'INVALID_UNIVERSITY' };
  return { email, firstName, lastName, password, universityId, profilePicUrl: String(body.profilePicUrl || '').trim().slice(0, 2048) };
};

app.get('/', (req, res) => res.json({ ok: true, service: 'Academia Smart Local API', health: '/api/health' }));
app.get('/api/health', (req, res) => {
  let writable = true;
  try { fs.accessSync(uploadsRoot, fs.constants.W_OK); } catch (_) { writable = false; }
  res.status(writable ? 200 : 503).json({
    ok: writable,
    provider: 'academia-local-storage',
    maxFileMb: maxMb,
    authentication: 'firebase-id-token',
    adminCredentialsConfigured: hasAdminCredentialConfiguration(),
    writable
  });
});

app.post('/api/recruiter-requests', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, key: 'recruiter-signup' }), async (req, res) => {
  const input = validRecruiterRequest(req.body || {});
  if (input.error) return sendError(res, 400, input.error, 'بيانات طلب الانضمام غير مكتملة أو غير صالحة.');
  let createdUid = null;
  try {
    const { auth, db, FieldValue } = getFirebaseAdmin();
    const university = await db.collection('universities').doc(input.universityId).get();
    if (!university.exists || university.data().active === false) {
      return sendError(res, 400, 'UNIVERSITY_NOT_ACTIVE', 'الجامعة المحددة غير متاحة حاليًا.');
    }

    try {
      await auth.getUserByEmail(input.email);
      return sendError(res, 409, 'EMAIL_IN_USE', 'البريد مستخدم بالفعل أو لديه طلب قائم.');
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    const authUser = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      disabled: true,
      emailVerified: false
    });
    createdUid = authUser.uid;
    req.body.password = '';
    input.password = '';

    const requestId = crypto.createHash('sha256').update(input.email).digest('hex').slice(0, 40);
    const requestRef = db.collection('recruiterRequests').doc(requestId);
    await db.runTransaction(async transaction => {
      const existing = await transaction.get(requestRef);
      if (existing.exists) {
        const conflict = new Error('REQUEST_EXISTS');
        conflict.code = 'REQUEST_EXISTS';
        throw conflict;
      }
      transaction.create(requestRef, {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        university: university.data().name || '',
        universityId: input.universityId,
        profilePicUrl: input.profilePicUrl,
        authUid: authUser.uid,
        status: 'pending',
        schemaVersion: 2,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(201).json({ ok: true, requestId, status: 'pending' });
  } catch (error) {
    if (createdUid) {
      try { await getFirebaseAdmin().auth.deleteUser(createdUid); } catch (cleanupError) { safeLog('SIGNUP_COMPENSATION_FAILED', cleanupError); }
    }
    if (error?.code === 'REQUEST_EXISTS') return sendError(res, 409, 'REQUEST_EXISTS', 'يوجد طلب سابق لهذا البريد.');
    safeLog('RECRUITER_REQUEST_FAILED', error);
    return sendError(res, 503, 'ACCOUNT_PROVISIONING_UNAVAILABLE', 'تعذر إرسال الطلب بأمان. تحقق من إعداد خدمة الحسابات ثم أعد المحاولة.');
  }
});

app.post('/api/admin/recruiter-requests/:requestId/approve', requireAuth, requirePermission('requests.manage'), async (req, res) => {
  const requestId = String(req.params.requestId || '');
  const attemptId = crypto.randomUUID();
  let enabledByThisAttempt = false;
  let authUid = null;
  try {
    const { auth, db, FieldValue } = getFirebaseAdmin();
    const requestRef = db.collection('recruiterRequests').doc(requestId);
    let requestData;
    const claim = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(requestRef);
      if (!snapshot.exists) throw Object.assign(new Error('REQUEST_NOT_FOUND'), { code: 'REQUEST_NOT_FOUND' });
      const data = snapshot.data();
      if (data.status === 'approved') return { duplicate: true, data };
      if (data.status !== 'pending') throw Object.assign(new Error('REQUEST_NOT_PENDING'), { code: 'REQUEST_NOT_PENDING' });
      if (!data.authUid) throw Object.assign(new Error('LEGACY_REQUEST_REQUIRES_RECOVERY'), { code: 'LEGACY_REQUEST_REQUIRES_RECOVERY' });
      transaction.update(requestRef, {
        status: 'processing', processingBy: req.actor.id, processingAttemptId: attemptId,
        processingStartedAt: FieldValue.serverTimestamp()
      });
      return { duplicate: false, data };
    });
    requestData = claim.data;
    authUid = requestData.authUid || requestData.provisionedUid;

    if (claim.duplicate) {
      const [authUser, userDoc] = await Promise.all([auth.getUser(authUid), db.collection('users').doc(authUid).get()]);
      const user = userDoc.data();
      if (!userDoc.exists || user.role !== 'recruiter' || user.accountStatus !== 'active' || user.universityId !== requestData.universityId || authUser.disabled) {
        throw Object.assign(new Error('APPROVED_REQUEST_INCONSISTENT'), { code: 'APPROVED_REQUEST_INCONSISTENT' });
      }
      return res.json({ ok: true, duplicate: true, uid: authUid, status: 'approved' });
    }

    const authUser = await auth.getUser(authUid);
    if (normalizeEmail(authUser.email) !== normalizeEmail(requestData.email)) {
      throw Object.assign(new Error('EMAIL_CONFLICT'), { code: 'EMAIL_CONFLICT' });
    }
    const existingUser = await db.collection('users').doc(authUid).get();
    if (existingUser.exists && existingUser.data().role && existingUser.data().role !== 'recruiter') {
      throw Object.assign(new Error('ROLE_CONFLICT'), { code: 'ROLE_CONFLICT' });
    }
    if (authUser.disabled) {
      await auth.updateUser(authUid, { disabled: false, displayName: `${requestData.firstName || ''} ${requestData.lastName || ''}`.trim() });
      enabledByThisAttempt = true;
    }

    await db.runTransaction(async transaction => {
      const currentRequest = await transaction.get(requestRef);
      if (!currentRequest.exists || currentRequest.data().processingAttemptId !== attemptId || currentRequest.data().status !== 'processing') {
        throw Object.assign(new Error('REQUEST_STATE_CHANGED'), { code: 'REQUEST_STATE_CHANGED' });
      }
      transaction.set(db.collection('users').doc(authUid), {
        firstName: requestData.firstName || '', lastName: requestData.lastName || '',
        email: normalizeEmail(requestData.email), profilePicUrl: requestData.profilePicUrl || '',
        university: requestData.university || '', universityId: requestData.universityId || '',
        role: 'recruiter', accountStatus: 'active', schemaVersion: 2,
        createdAt: existingUser.exists ? (existingUser.data().createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(), provisionedBy: req.actor.id
      }, { merge: false });
      transaction.update(requestRef, {
        status: 'approved', provisionedUid: authUid, processedBy: req.actor.id,
        processedAt: FieldValue.serverTimestamp(), processingAttemptId: FieldValue.delete(),
        processingBy: FieldValue.delete(), processingStartedAt: FieldValue.delete(), failureCode: FieldValue.delete()
      });
      const logRef = db.collection('adminLogs').doc(adminLogId('approve_recruiter_request', requestId));
      transaction.set(logRef, adminLogData('approve_recruiter_request', requestId, req.actor, { uid: authUid, universityId: requestData.universityId }), { merge: false });
    });
    return res.json({ ok: true, duplicate: false, uid: authUid, status: 'approved' });
  } catch (error) {
    if (enabledByThisAttempt && authUid) {
      try { await getFirebaseAdmin().auth.updateUser(authUid, { disabled: true }); } catch (compensationError) { safeLog('APPROVAL_AUTH_COMPENSATION_FAILED', compensationError); }
    }
    try {
      const { db, FieldValue } = getFirebaseAdmin();
      const ref = db.collection('recruiterRequests').doc(requestId);
      await db.runTransaction(async transaction => {
        const current = await transaction.get(ref);
        if (current.exists && current.data().processingAttemptId === attemptId) {
          transaction.update(ref, {
            status: 'pending', failureCode: String(error?.code || 'PROVISIONING_FAILED').slice(0, 80),
            failedAt: FieldValue.serverTimestamp(), processingAttemptId: FieldValue.delete(),
            processingBy: FieldValue.delete(), processingStartedAt: FieldValue.delete()
          });
        }
      });
    } catch (stateError) { safeLog('APPROVAL_STATE_COMPENSATION_FAILED', stateError); }
    const known = {
      REQUEST_NOT_FOUND: [404, 'الطلب غير موجود.'],
      REQUEST_NOT_PENDING: [409, 'الطلب لم يعد معلقًا.'],
      LEGACY_REQUEST_REQUIRES_RECOVERY: [409, 'هذا طلب قديم يحتاج استعادة آمنة للحساب قبل القبول.'],
      EMAIL_CONFLICT: [409, 'البريد مرتبط بحساب مختلف.'],
      ROLE_CONFLICT: [409, 'الحساب الموجود يحمل دورًا متعارضًا.'],
      APPROVED_REQUEST_INCONSISTENT: [409, 'الطلب معتمد لكن بيانات الحساب غير متسقة وتحتاج مراجعة.']
    };
    safeLog('RECRUITER_APPROVAL_FAILED', error);
    const mapped = known[error?.code] || [503, 'فشل إنشاء أو تفعيل الحساب. بقي الطلب معلقًا ولم تُعرض نتيجة نجاح.'];
    return sendError(res, mapped[0], error?.code || 'PROVISIONING_FAILED', mapped[1]);
  }
});

app.post('/api/admin/recruiter-requests/:requestId/reject', requireAuth, requirePermission('requests.manage'), async (req, res) => {
  const requestId = String(req.params.requestId || '');
  try {
    const { auth, db, FieldValue } = getFirebaseAdmin();
    const requestRef = db.collection('recruiterRequests').doc(requestId);
    let authUid = null;
    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(requestRef);
      if (!snapshot.exists) throw Object.assign(new Error('REQUEST_NOT_FOUND'), { code: 'REQUEST_NOT_FOUND' });
      const data = snapshot.data();
      if (data.status === 'rejected') return { duplicate: true, data };
      if (data.status !== 'pending') throw Object.assign(new Error('REQUEST_NOT_PENDING'), { code: 'REQUEST_NOT_PENDING' });
      authUid = data.authUid || null;
      transaction.update(requestRef, {
        status: 'rejected', processedBy: req.actor.id, processedAt: FieldValue.serverTimestamp(),
        rejectionReason: String(req.body?.reason || '').trim().slice(0, 500)
      });
      transaction.set(db.collection('adminLogs').doc(adminLogId('reject_recruiter_request', requestId)),
        adminLogData('reject_recruiter_request', requestId, req.actor), { merge: false });
      return { duplicate: false, data };
    });
    if (!result.duplicate && authUid) {
      try {
        const staged = await auth.getUser(authUid);
        const userDoc = await db.collection('users').doc(authUid).get();
        if (staged.disabled && !userDoc.exists) await auth.deleteUser(authUid);
      } catch (error) {
        if (error?.code !== 'auth/user-not-found') {
          safeLog('REJECTED_AUTH_CLEANUP_FAILED', error);
          await requestRef.set({ authCleanupPending: true }, { merge: true });
        }
      }
    }
    return res.json({ ok: true, duplicate: result.duplicate, status: 'rejected' });
  } catch (error) {
    safeLog('RECRUITER_REJECTION_FAILED', error);
    const status = error?.code === 'REQUEST_NOT_FOUND' ? 404 : 409;
    return sendError(res, status, error?.code || 'REJECTION_FAILED', 'تعذر رفض الطلب بأمان.');
  }
});

app.post('/api/admin/users/limited-admin', requireAuth, requirePermission('users.manage'), async (req, res) => {
  if (!isSuperAdmin(req.actor)) return sendError(res, 403, 'SUPER_ADMIN_REQUIRED', 'إنشاء المديرين متاح للمدير الرئيسي فقط.');
  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();
  const email = normalizeEmail(req.body?.email);
  let password = String(req.body?.password || '');
  const permissions = Array.isArray(req.body?.permissions) ? [...new Set(req.body.permissions.map(String))] : [];
  const allowedPermissions = new Set(['users.manage', 'requests.manage', 'academic.manage', 'jobs.view', 'reports.view', 'audit.view']);
  if (!firstName || !email || password.length < 6 || permissions.some(item => !allowedPermissions.has(item))) {
    return sendError(res, 400, 'INVALID_ADMIN_INPUT', 'بيانات المدير أو الصلاحيات غير صالحة.');
  }
  let uid = null;
  try {
    const { auth, db, FieldValue } = getFirebaseAdmin();
    const user = await auth.createUser({ email, password, disabled: false, displayName: `${firstName} ${lastName}`.trim() });
    uid = user.uid;
    req.body.password = '';
    password = '';
    await db.runTransaction(async transaction => {
      transaction.create(db.collection('users').doc(uid), {
        firstName, lastName, email, role: 'admin', adminLevel: 'limited', permissions,
        accountStatus: 'active', createdAt: FieldValue.serverTimestamp(), createdBy: req.actor.id
      });
      transaction.create(db.collection('adminLogs').doc(adminLogId('create_limited_admin', uid)),
        adminLogData('create_limited_admin', uid, req.actor, { email, permissions }));
    });
    return res.status(201).json({ ok: true, uid });
  } catch (error) {
    if (uid) {
      try { await getFirebaseAdmin().auth.deleteUser(uid); } catch (cleanupError) { safeLog('ADMIN_CREATE_COMPENSATION_FAILED', cleanupError); }
    }
    safeLog('ADMIN_CREATE_FAILED', error);
    return sendError(res, error?.code === 'auth/email-already-exists' ? 409 : 503, error?.code || 'ADMIN_CREATE_FAILED', error?.code === 'auth/email-already-exists' ? 'البريد مستخدم مسبقًا.' : 'تعذر إنشاء المدير بأمان.');
  }
});

app.patch('/api/admin/users/:uid/security', requireAuth, requirePermission('users.manage'), async (req, res) => {
  const uid = String(req.params.uid || '');
  const allowedKeys = new Set(['role', 'permissions', 'adminLevel', 'accountStatus']);
  const patchKeys = Object.keys(req.body || {});
  if (!patchKeys.length || patchKeys.some(key => !allowedKeys.has(key))) return sendError(res, 400, 'INVALID_SECURITY_PATCH', 'تعديل الصلاحيات غير صالح.');
  if (uid === req.actor.id) return sendError(res, 403, 'SELF_SECURITY_CHANGE_DENIED', 'لا يمكن تعديل صلاحيات أو حالة حسابك الحالي.');
  try {
    const { auth, db, FieldValue } = getFirebaseAdmin();
    const targetRef = db.collection('users').doc(uid);
    const targetSnapshot = await targetRef.get();
    if (!targetSnapshot.exists) return sendError(res, 404, 'USER_NOT_FOUND', 'الحساب غير موجود.');
    const target = targetSnapshot.data();
    if (isSuperAdmin(target)) return sendError(res, 403, 'SUPER_ADMIN_PROTECTED', 'لا يمكن تعديل المدير الرئيسي من إدارة الحسابات العادية.');
    const changesPrivileges = patchKeys.some(key => ['role', 'permissions', 'adminLevel'].includes(key));
    if (changesPrivileges && !isSuperAdmin(req.actor)) return sendError(res, 403, 'SUPER_ADMIN_REQUIRED', 'تغيير الأدوار والصلاحيات متاح للمدير الرئيسي فقط.');
    if (!isSuperAdmin(req.actor) && target.role === 'admin') return sendError(res, 403, 'ADMIN_TARGET_PROTECTED', 'لا يمكن للمدير المحدود تعديل مدير آخر.');

    const patch = {};
    if ('role' in req.body && ['lecturer', 'recruiter', 'admin'].includes(req.body.role)) patch.role = req.body.role;
    if ('accountStatus' in req.body && ['active', 'suspended', 'blocked'].includes(req.body.accountStatus)) patch.accountStatus = req.body.accountStatus;
    if ('adminLevel' in req.body && req.body.adminLevel === 'limited') patch.adminLevel = 'limited';
    if ('permissions' in req.body && Array.isArray(req.body.permissions)) patch.permissions = [...new Set(req.body.permissions.map(String))];
    if (!Object.keys(patch).length) return sendError(res, 400, 'INVALID_SECURITY_PATCH', 'لا توجد قيم صالحة للتحديث.');

    const authUser = await auth.getUser(uid);
    const shouldDisable = ['blocked', 'suspended'].includes(patch.accountStatus);
    if ('accountStatus' in patch) await auth.updateUser(uid, { disabled: shouldDisable });
    try {
      await db.runTransaction(async transaction => {
        transaction.update(targetRef, { ...patch, updatedAt: FieldValue.serverTimestamp(), securityUpdatedBy: req.actor.id });
        transaction.create(db.collection('adminLogs').doc(adminLogId(`security_${Date.now()}`, uid)),
          adminLogData('update_user_security', uid, req.actor, patch));
      });
    } catch (error) {
      if ('accountStatus' in patch) await auth.updateUser(uid, { disabled: authUser.disabled });
      throw error;
    }
    await auth.revokeRefreshTokens(uid);
    return res.json({ ok: true, uid, patch });
  } catch (error) {
    safeLog('USER_SECURITY_UPDATE_FAILED', error);
    return sendError(res, 503, 'USER_SECURITY_UPDATE_FAILED', 'تعذر تحديث صلاحيات الحساب بأمان.');
  }
});

const cleanText = (value, max = 500) => String(value || '').trim().slice(0, max);
const experienceIdentity = experience => [
  experience?.universityId, experience?.collegeId, experience?.departmentId,
  experience?.subjectId, experience?.university, experience?.department,
  experience?.course, experience?.otherCourse
].map(value => cleanText(value, 160)).join('|');

const sanitizeExperience = experience => ({
  universityId: cleanText(experience?.universityId, 160),
  collegeId: cleanText(experience?.collegeId, 160),
  departmentId: cleanText(experience?.departmentId, 160),
  subjectId: cleanText(experience?.subjectId, 160),
  university: cleanText(experience?.university, 200),
  department: cleanText(experience?.department, 200),
  course: cleanText(experience?.course, 200),
  otherCourse: cleanText(experience?.otherCourse, 200),
  description: cleanText(experience?.description, 2000),
  opinion: cleanText(experience?.opinion, 2000),
  rating: cleanText(experience?.rating, 8)
});

app.patch('/api/profile', requireAuth, async (req, res) => {
  if (req.actor.role !== 'lecturer') return sendError(res, 403, 'LECTURER_PROFILE_ONLY', 'هذا المسار مخصص لملف المحاضر.');
  const submittedExperiences = Array.isArray(req.body?.teachingExperience) ? req.body.teachingExperience : [];
  if (submittedExperiences.length > 100) return sendError(res, 400, 'TOO_MANY_EXPERIENCES', 'عدد سجلات الخبرة يتجاوز الحد المسموح.');
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const userRef = db.collection('users').doc(req.actor.id);
    const currentSnapshot = await userRef.get();
    const currentExperiences = Array.isArray(currentSnapshot.data()?.teachingExperience)
      ? currentSnapshot.data().teachingExperience : [];
    const currentByIdentity = new Map(currentExperiences.map(item => [experienceIdentity(item), item]));
    const teachingExperience = submittedExperiences.map(item => {
      const safe = sanitizeExperience(item);
      const trusted = currentByIdentity.get(experienceIdentity(safe));
      return {
        ...safe,
        verificationStatus: trusted?.verificationStatus || 'pending',
        verified: trusted?.verified === true,
        verifiedBy: trusted?.verifiedBy || null,
        verificationId: trusted?.verificationId || null
      };
    });
    const patch = {
      firstName: cleanText(req.body?.firstName, 80),
      lastName: cleanText(req.body?.lastName, 80),
      education: cleanText(req.body?.education, 500),
      department: cleanText(req.body?.department, 200),
      cvUrl: cleanText(req.body?.cvUrl, 2048),
      certificatesUrl: cleanText(req.body?.certificatesUrl, 2048),
      skills: Array.isArray(req.body?.skills) ? req.body.skills.slice(0, 100).map(value => cleanText(value, 120)).filter(Boolean) : [],
      yearsExperience: cleanText(req.body?.yearsExperience, 20),
      teachingExperience,
      updatedAt: FieldValue.serverTimestamp()
    };
    await userRef.update(patch);
    return res.json({ ok: true, teachingExperience });
  } catch (error) {
    safeLog('PROFILE_UPDATE_FAILED', error);
    return sendError(res, 503, 'PROFILE_UPDATE_FAILED', 'تعذر حفظ الملف الشخصي بأمان.');
  }
});

app.post('/api/verifications/:verificationId/decision', requireAuth, async (req, res) => {
  if (req.actor.role !== 'recruiter') return sendError(res, 403, 'RECRUITER_REQUIRED', 'هذه العملية مخصصة لمسؤول التوظيف.');
  const decision = req.body?.decision;
  if (!['accepted', 'rejected'].includes(decision)) return sendError(res, 400, 'INVALID_DECISION', 'قرار التحقق غير صالح.');
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const verificationRef = db.collection('verifications').doc(String(req.params.verificationId || ''));
    await db.runTransaction(async transaction => {
      const verificationSnapshot = await transaction.get(verificationRef);
      if (!verificationSnapshot.exists) throw Object.assign(new Error('VERIFICATION_NOT_FOUND'), { code: 'VERIFICATION_NOT_FOUND' });
      const verification = verificationSnapshot.data();
      if (verification.recruiterId !== req.actor.id) throw Object.assign(new Error('VERIFICATION_ACCESS_DENIED'), { code: 'VERIFICATION_ACCESS_DENIED' });
      if (['accepted', 'rejected'].includes(verification.status)) return;
      const userRef = db.collection('users').doc(verification.lecturerId);
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw Object.assign(new Error('LECTURER_NOT_FOUND'), { code: 'LECTURER_NOT_FOUND' });
      const experiences = Array.isArray(userSnapshot.data().teachingExperience) ? [...userSnapshot.data().teachingExperience] : [];
      const index = Number(verification.experienceIndex);
      if (!Number.isInteger(index) || index < 0 || index >= experiences.length) {
        throw Object.assign(new Error('EXPERIENCE_NOT_FOUND'), { code: 'EXPERIENCE_NOT_FOUND' });
      }
      const candidate = experiences[index];
      if (cleanText(candidate.course, 200) !== cleanText(verification.course, 200)
        || cleanText(candidate.university, 200) !== cleanText(verification.university, 200)) {
        throw Object.assign(new Error('EXPERIENCE_MISMATCH'), { code: 'EXPERIENCE_MISMATCH' });
      }
      experiences[index] = {
        ...candidate,
        verificationStatus: decision === 'accepted' ? 'verified' : 'rejected',
        verified: decision === 'accepted',
        verificationId: verificationSnapshot.id,
        verifiedBy: decision === 'accepted' ? {
          id: req.actor.id,
          name: `${req.actor.firstName || ''} ${req.actor.lastName || ''}`.trim(),
          at: new Date().toISOString()
        } : null
      };
      transaction.update(userRef, { teachingExperience: experiences, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(verificationRef, {
        status: decision, actionTakenBy: req.actor.id, updatedAt: FieldValue.serverTimestamp()
      });
    });
    return res.json({ ok: true, decision });
  } catch (error) {
    safeLog('VERIFICATION_DECISION_FAILED', error);
    const denied = error?.code === 'VERIFICATION_ACCESS_DENIED';
    return sendError(res, denied ? 403 : 409, error?.code || 'VERIFICATION_DECISION_FAILED', 'تعذر اعتماد قرار التحقق بأمان.');
  }
});

app.post('/api/notifications/:notificationId/action', requireAuth, async (req, res) => {
  if (req.actor.role !== 'recruiter') return sendError(res, 403, 'RECRUITER_REQUIRED', 'هذه العملية مخصصة لمسؤول التوظيف.');
  const action = req.body?.action;
  if (!['accepted', 'rejected'].includes(action)) return sendError(res, 400, 'INVALID_NOTIFICATION_ACTION', 'إجراء الإشعار غير صالح.');
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const notificationRef = db.collection('notifications').doc(String(req.params.notificationId || ''));
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(notificationRef);
      if (!snapshot.exists) throw Object.assign(new Error('NOTIFICATION_NOT_FOUND'), { code: 'NOTIFICATION_NOT_FOUND' });
      const notification = snapshot.data();
      const receiverId = notification.userId || notification.receiverId || notification.receiver?.id;
      if (receiverId !== req.actor.id) throw Object.assign(new Error('NOTIFICATION_ACCESS_DENIED'), { code: 'NOTIFICATION_ACCESS_DENIED' });
      if (!['rating_request', 'university_verification', 'course_verification'].includes(notification.type)) {
        throw Object.assign(new Error('NOTIFICATION_ACTION_NOT_ALLOWED'), { code: 'NOTIFICATION_ACTION_NOT_ALLOWED' });
      }
      const actionPatch = {
        status: action,
        read: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        actionTakenBy: {
          id: req.actor.id,
          name: `${req.actor.firstName || ''} ${req.actor.lastName || ''}`.trim(),
          email: req.actor.email || ''
        }
      };
      if (notification.type === 'rating_request') actionPatch.businessStatus = action;
      transaction.update(notificationRef, actionPatch);
    });
    return res.json({ ok: true, action });
  } catch (error) {
    safeLog('NOTIFICATION_ACTION_FAILED', error);
    const status = error?.code === 'NOTIFICATION_NOT_FOUND' ? 404
      : error?.code === 'NOTIFICATION_ACCESS_DENIED' ? 403 : 409;
    return sendError(res, status, error?.code || 'NOTIFICATION_ACTION_FAILED', 'تعذر تنفيذ إجراء الإشعار بأمان.');
  }
});

app.post('/api/rating-requests', requireAuth, async (req, res) => {
  if (req.actor.role !== 'lecturer') return sendError(res, 403, 'LECTURER_REQUIRED', 'هذه العملية مخصصة للمحاضر.');
  const interviewId = String(req.body?.interviewId || '').trim();
  if (!interviewId || interviewId.length > 300) return sendError(res, 400, 'INVALID_INTERVIEW_ID', 'حدد مقابلة صالحة.');
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const interviewRef = db.collection('interviews').doc(interviewId);
    const requestId = ratingRequestId(interviewId);
    const requestRef = db.collection('notifications').doc(requestId);
    await db.runTransaction(async transaction => {
      const [interviewSnapshot, existingRequest] = await Promise.all([
        transaction.get(interviewRef), transaction.get(requestRef)
      ]);
      if (!interviewSnapshot.exists) throw Object.assign(new Error('INTERVIEW_NOT_FOUND'), { code: 'INTERVIEW_NOT_FOUND' });
      if (existingRequest.exists) throw Object.assign(new Error('DUPLICATE_RATING_REQUEST'), { code: 'DUPLICATE_RATING_REQUEST' });
      const interview = interviewSnapshot.data();
      if (interview.candidateId !== req.actor.id || interview.status !== 'completed') {
        throw Object.assign(new Error('RATING_REQUEST_NOT_ALLOWED'), { code: 'RATING_REQUEST_NOT_ALLOWED' });
      }
      const applicationRef = db.collection('applications').doc(interview.applicationId);
      const applicationSnapshot = await transaction.get(applicationRef);
      if (!applicationSnapshot.exists) throw Object.assign(new Error('APPLICATION_NOT_FOUND'), { code: 'APPLICATION_NOT_FOUND' });
      const application = applicationSnapshot.data();
      if (application.applicantId !== req.actor.id || application.recruiterId !== interview.recruiterId) {
        throw Object.assign(new Error('RATING_RELATION_MISMATCH'), { code: 'RATING_RELATION_MISMATCH' });
      }
      const recruiterRef = db.collection('users').doc(interview.recruiterId);
      const recruiterSnapshot = await transaction.get(recruiterRef);
      if (!recruiterSnapshot.exists || recruiterSnapshot.data().role !== 'recruiter') {
        throw Object.assign(new Error('RECRUITER_NOT_FOUND'), { code: 'RECRUITER_NOT_FOUND' });
      }
      const recruiter = recruiterSnapshot.data();
      const lecturerName = `${req.actor.firstName || ''} ${req.actor.lastName || ''}`.trim() || 'المحاضر';
      const recruiterName = `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim() || 'مسؤول التوظيف';
      transaction.create(requestRef, {
        type: 'rating_request', title: 'طلب تقييم بعد المقابلة',
        message: `طلب ${lecturerName} تقييمه بعد مقابلة وظيفة «${interview.positionTitle || application.positionTitle || 'الوظيفة'}».`,
        status: 'pending', businessStatus: 'pending', read: false,
        sender: { id: req.actor.id, name: lecturerName, email: req.actor.email || '' },
        receiver: { id: interview.recruiterId, name: recruiterName, email: recruiter.email || '' },
        userId: interview.recruiterId, lecturerId: req.actor.id, recruiterId: interview.recruiterId,
        applicationId: interview.applicationId, interviewId, positionId: interview.positionId || application.positionId,
        positionTitle: interview.positionTitle || application.positionTitle || '', requestId,
        eventKey: `rating-request:${interviewId}`,
        deepLink: `/recruiter-dashboard?section=ratings&requestId=${encodeURIComponent(requestId)}`,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(201).json({ ok: true, requestId });
  } catch (error) {
    safeLog('RATING_REQUEST_FAILED', error);
    const status = error?.code === 'DUPLICATE_RATING_REQUEST' ? 409
      : ['RATING_REQUEST_NOT_ALLOWED', 'RATING_RELATION_MISMATCH'].includes(error?.code) ? 403
        : error?.code === 'INTERVIEW_NOT_FOUND' ? 404 : 409;
    const message = error?.code === 'DUPLICATE_RATING_REQUEST'
      ? 'تم إرسال طلب تقييم لهذه المقابلة مسبقًا.' : 'تعذر إنشاء طلب التقييم بأمان.';
    return sendError(res, status, error?.code || 'RATING_REQUEST_FAILED', message);
  }
});

app.post('/api/rating-requests/:requestId/rating', requireAuth, async (req, res) => {
  if (req.actor.role !== 'recruiter') return sendError(res, 403, 'RECRUITER_REQUIRED', 'هذه العملية مخصصة لمسؤول التوظيف.');
  const input = normalizeRatingInput(req.body || {});
  if (input.error) return sendError(res, 400, input.error, input.error === 'INVALID_RATING_SCORE' ? 'يجب أن يكون التقييم رقمًا صحيحًا من 1 إلى 5.' : 'اكتب تعليقًا مهنيًا صالحًا.');
  const requestId = String(req.params.requestId || '').trim();
  try {
    const { db, FieldValue } = getFirebaseAdmin();
    const requestRef = db.collection('notifications').doc(requestId);
    let ratingId = '';
    await db.runTransaction(async transaction => {
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists) throw Object.assign(new Error('RATING_REQUEST_NOT_FOUND'), { code: 'RATING_REQUEST_NOT_FOUND' });
      const request = requestSnapshot.data();
      const interviewRef = db.collection('interviews').doc(request.interviewId || 'missing');
      const applicationRef = db.collection('applications').doc(request.applicationId || 'missing');
      const [interviewSnapshot, applicationSnapshot] = await Promise.all([
        transaction.get(interviewRef), transaction.get(applicationRef)
      ]);
      const interview = interviewSnapshot.exists ? { id: interviewSnapshot.id, ...interviewSnapshot.data() } : null;
      const application = applicationSnapshot.exists ? { id: applicationSnapshot.id, ...applicationSnapshot.data() } : null;
      const relationError = validateRatingRelations({ request, interview, application, actorId: req.actor.id });
      if (relationError) throw Object.assign(new Error(relationError), { code: relationError });
      ratingId = ratingDocumentId(request.interviewId);
      const ratingRef = db.collection('ratings').doc(ratingId);
      const existingRating = await transaction.get(ratingRef);
      if (existingRating.exists) throw Object.assign(new Error('DUPLICATE_RATING'), { code: 'DUPLICATE_RATING' });
      const resultNotificationId = ratingResultNotificationId(ratingId);
      const resultRef = db.collection('notifications').doc(resultNotificationId);
      const existingResult = await transaction.get(resultRef);
      if (existingResult.exists) throw Object.assign(new Error('DUPLICATE_RATING_RESULT'), { code: 'DUPLICATE_RATING_RESULT' });
      const recruiterName = `${req.actor.firstName || ''} ${req.actor.lastName || ''}`.trim() || 'مسؤول التوظيف';
      const lecturerName = request.sender?.name || 'المحاضر';
      transaction.create(ratingRef, {
        requestId, lecturerId: request.lecturerId, recruiterId: req.actor.id,
        applicationId: request.applicationId, interviewId: request.interviewId,
        positionId: request.positionId || application.positionId, positionTitle: request.positionTitle || interview.positionTitle || '',
        lecturerName, lecturerEmail: request.sender?.email || '', recruiterName, recruiterEmail: req.actor.email || '',
        rating: input.rating, score: input.rating, feedback: input.comment, comment: input.comment,
        status: 'completed', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), ratedAt: FieldValue.serverTimestamp()
      });
      transaction.update(requestRef, {
        status: 'resolved', businessStatus: 'resolved', ratingId,
        resolvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
      transaction.create(resultRef, {
        type: 'rating_received', title: 'تم استلام تقييمك',
        message: `تم تقييمك بدرجة ${input.rating} من 5 بعد مقابلة وظيفة «${request.positionTitle || interview.positionTitle || 'الوظيفة'}».`,
        sender: { id: req.actor.id, name: recruiterName, email: req.actor.email || '' },
        receiver: { id: request.lecturerId, name: lecturerName, email: request.sender?.email || '' },
        userId: request.lecturerId, lecturerId: request.lecturerId, recruiterId: req.actor.id,
        applicationId: request.applicationId, interviewId: request.interviewId,
        positionId: request.positionId || application.positionId, ratingId, requestId,
        rating: input.rating, read: false, eventKey: `rating-result:${ratingId}`,
        deepLink: `/lecturer-dashboard?section=ratings&ratingId=${encodeURIComponent(ratingId)}`,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    return res.status(201).json({ ok: true, ratingId });
  } catch (error) {
    safeLog('RATING_SUBMIT_FAILED', error);
    const status = error?.code === 'RATING_REQUEST_NOT_FOUND' ? 404
      : ['RATING_ACCESS_DENIED', 'RATING_RELATION_MISMATCH'].includes(error?.code) ? 403 : 409;
    const message = error?.code === 'DUPLICATE_RATING' ? 'تم تسجيل تقييم لهذه المقابلة مسبقًا.' : 'تعذر حفظ التقييم بأمان.';
    return sendError(res, status, error?.code || 'RATING_SUBMIT_FAILED', message);
  }
});

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const user = sanitizeSegment(req.authUser.uid);
    const category = sanitizeSegment(req.body.category || 'document');
    const directory = path.join(uploadsRoot, user, category);
    fs.mkdirSync(directory, { recursive: true });
    callback(null, directory);
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname || '').toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1, fields: 2, parts: 3, fieldNameSize: 64, fieldSize: 1024 },
  fileFilter(req, file, callback) {
    if (!isExtensionAllowed(file.mimetype, file.originalname)) {
      const error = new Error('FILE_TYPE_NOT_ALLOWED');
      error.code = 'FILE_TYPE_NOT_ALLOWED';
      return callback(error);
    }
    return callback(null, true);
  }
});

const readSignature = filePath => {
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(16);
    const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytes);
  } finally { fs.closeSync(descriptor); }
};

app.post('/api/files/upload', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: 'file-upload' }), upload.single('file'), (req, res) => {
  if (!req.file) return sendError(res, 400, 'FILE_REQUIRED', 'لم يتم استلام ملف.');
  try {
    if (!hasAllowedSignature(readSignature(req.file.path), req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return sendError(res, 415, 'FILE_SIGNATURE_MISMATCH', 'محتوى الملف لا يطابق نوعه أو امتداده.');
    }
    const base = String(process.env.FILE_PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const relative = path.relative(uploadsRoot, req.file.path).split(path.sep).map(encodeURIComponent).join('/');
    return res.status(201).json({
      ok: true, url: `${base}/uploads/${relative}`, path: relative,
      name: safeOriginalName(req.file.originalname), type: req.file.mimetype,
      size: req.file.size, provider: 'local', uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (_) {}
    safeLog('FILE_VALIDATION_FAILED', error);
    return sendError(res, 400, 'FILE_VALIDATION_FAILED', 'تعذر التحقق من الملف المرفوع.');
  }
});

const canReadFile = async (actor, relativePath, documentId) => {
  const ownerUid = String(relativePath || '').split('/')[0];
  if (ownerUid === actor.id) return true;
  if (actor.role === 'admin' && (isSuperAdmin(actor) || hasPermission(actor, 'users.manage'))) return true;
  if (actor.role !== 'recruiter') return false;
  const { db } = getFirebaseAdmin();
  if (documentId) {
    const document = await db.collection('documents').doc(documentId).get();
    if (document.exists && document.data().storagePath === relativePath && document.data().recruiterId === actor.id) return true;
  }
  const directApplications = await db.collection('applications')
    .where('applicantId', '==', ownerUid).where('recruiterId', '==', actor.id).limit(1).get();
  if (!directApplications.empty) return true;
  const legacyApplications = await db.collection('applications').where('applicantId', '==', ownerUid).limit(50).get();
  for (const application of legacyApplications.docs) {
    const data = application.data();
    if (!data.positionId) continue;
    const position = await db.collection('positions').doc(data.positionId).get();
    if (position.exists && position.data().postedBy?.id === actor.id) return true;
  }
  return false;
};

const serveProtectedFile = async (req, res) => {
  try {
    const relativePath = String(req.params[0] || '').replace(/\\/g, '/');
    const filePath = resolvePathWithinRoot(uploadsRoot, relativePath);
    if (!filePath) return sendError(res, 400, 'INVALID_FILE_PATH', 'مسار الملف غير صالح.');
    if (!await canReadFile(req.actor, relativePath, String(req.get('x-document-id') || ''))) {
      return sendError(res, 403, 'FILE_ACCESS_DENIED', 'ليست لديك صلاحية فتح هذا الملف.');
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return sendError(res, 404, 'FILE_NOT_FOUND', 'الملف غير متوفر أو تم نقله.');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.sendFile(filePath);
  } catch (error) {
    safeLog('FILE_READ_FAILED', error);
    return sendError(res, 404, 'FILE_NOT_FOUND', 'الملف غير متوفر أو تم نقله.');
  }
};

app.get('/uploads/*', requireAuth, serveProtectedFile);
app.get('/api/files/*', requireAuth, serveProtectedFile);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (_) {}
  if (err?.code === 'LIMIT_FILE_SIZE') return sendError(res, 413, 'FILE_TOO_LARGE', `حجم الملف يجب ألا يتجاوز ${maxMb}MB.`);
  if (String(err?.code || '').startsWith('LIMIT_')) return sendError(res, 400, 'INVALID_UPLOAD_REQUEST', 'طلب رفع الملف غير صالح.');
  if (err?.code === 'FILE_TYPE_NOT_ALLOWED') return sendError(res, 415, 'FILE_TYPE_NOT_ALLOWED', 'نوع الملف أو امتداده غير مسموح.');
  if (err?.code === 'CORS_ORIGIN_DENIED') return sendError(res, 403, 'CORS_ORIGIN_DENIED', 'مصدر الطلب غير مسموح.');
  safeLog('API_ERROR', err);
  return sendError(res, 400, 'REQUEST_FAILED', 'تعذر تنفيذ الطلب.');
});

const startServer = () => app.listen(PORT, () => console.log(`Academia local API listening on port ${PORT}`));
if (require.main === module) startServer();

module.exports = { app, maxMb, originAllowed, startServer, uploadsRoot };
