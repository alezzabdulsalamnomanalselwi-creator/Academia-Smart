import { auth } from '../firebase/config';

const getApiBase = () => (process.env.REACT_APP_FILE_API_URL || 'http://localhost:5050').replace(/\/$/, '');

const authenticatedFetch = async (url, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('يلزم تسجيل الدخول لتنفيذ هذه العملية.');

  const send = async forceRefresh => {
    if (auth.currentUser?.uid !== user.uid) throw new Error('تغيرت جلسة الدخول. أعد المحاولة.');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${await user.getIdToken(forceRefresh)}`);
    return fetch(url, { ...options, headers });
  };

  let response = await send(false);
  if (response.status === 401) response = await send(true);
  return response;
};

const parseResponse = async response => {
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    const error = new Error(data.message || data.error || `فشل الطلب (${response.status})`);
    error.code = data.code || 'API_REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }
  return data;
};

export const apiRequest = async (path, options = {}, { authenticated = true } = {}) => {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const request = { ...options, headers };
  const response = authenticated
    ? await authenticatedFetch(`${getApiBase()}${path}`, request)
    : await fetch(`${getApiBase()}${path}`, request);
  return parseResponse(response);
};

export const submitRecruiterRequest = payload => apiRequest('/api/recruiter-requests', {
  method: 'POST',
  body: JSON.stringify(payload)
}, { authenticated: false });

export const processRecruiterRequest = (requestId, action) => apiRequest(
  `/api/admin/recruiter-requests/${encodeURIComponent(requestId)}/${action}`,
  { method: 'POST', body: JSON.stringify({}) }
);

export const updateUserSecurity = (uid, patch) => apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/security`, {
  method: 'PATCH',
  body: JSON.stringify(patch)
});

export const createLimitedAdminAccount = payload => apiRequest('/api/admin/users/limited-admin', {
  method: 'POST',
  body: JSON.stringify(payload)
});

export const updateOwnProfile = payload => apiRequest('/api/profile', {
  method: 'PATCH',
  body: JSON.stringify(payload)
});

export const decideVerification = (verificationId, decision) => apiRequest(
  `/api/verifications/${encodeURIComponent(verificationId)}/decision`,
  { method: 'POST', body: JSON.stringify({ decision }) }
);

export const recordNotificationAction = (notificationId, action) => apiRequest(
  `/api/notifications/${encodeURIComponent(notificationId)}/action`,
  { method: 'POST', body: JSON.stringify({ action }) }
);

export const createRatingRequest = interviewId => apiRequest('/api/rating-requests', {
  method: 'POST',
  body: JSON.stringify({ interviewId })
});

export const submitRating = (requestId, rating, comment) => apiRequest(
  `/api/rating-requests/${encodeURIComponent(requestId)}/rating`,
  { method: 'POST', body: JSON.stringify({ rating, comment }) }
);

const isLocalFileUrl = value => {
  try {
    const target = new URL(value, window.location.origin);
    const api = new URL(getApiBase());
    return target.origin === api.origin && (target.pathname.startsWith('/uploads/') || target.pathname.startsWith('/api/files/'));
  } catch (_) { return false; }
};

export const openProtectedFile = async (url, { documentId } = {}) => {
  if (!url) throw new Error('رابط الملف غير متوفر.');
  if (!isLocalFileUrl(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const headers = {};
  if (documentId) headers['X-Document-Id'] = documentId;
  const response = await authenticatedFetch(url, { headers });
  if (!response.ok) await parseResponse(response);
  const blobUrl = URL.createObjectURL(await response.blob());
  const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');
  if (!opened) URL.revokeObjectURL(blobUrl);
  else setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

// Keep file access feedback aligned with the API contract. In particular, an
// authorization or storage failure must never be presented as a stale session.
export const fileAccessErrorMessage = error => {
  switch (Number(error?.status)) {
    case 401: return 'جلسة الدخول غير صالحة أو منتهية. أعد تسجيل الدخول ثم حاول مرة أخرى.';
    case 403: return 'ليست لديك صلاحية فتح هذا الملف.';
    case 404: return 'الملف غير متوفر أو تم نقله.';
    case 500: return 'تعذر الوصول إلى خدمة الملفات. حاول مرة أخرى لاحقًا.';
    default: return error?.message || 'تعذر فتح الملف. حاول مرة أخرى لاحقًا.';
  }
};

export { getApiBase };
