import { auth } from '../firebase/config';

const getApiBase = () => (process.env.REACT_APP_FILE_API_URL || 'http://localhost:5050').replace(/\/$/, '');

/** Local upload service. Files are stored by the bundled Express backend. */
export const uploadUserDocument = ({ userId, file, category = 'document', onProgress, timeoutMs = 60000 }) => new Promise(async (resolve, reject) => {
  if (!userId || !file) { reject(new Error('Missing user or file')); return; }
  if (!auth.currentUser || auth.currentUser.uid !== userId) { reject(new Error('يلزم تسجيل الدخول بحساب مالك الملف.')); return; }
  const xhr = new XMLHttpRequest();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  let settled = false;
  const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
  const timer = setTimeout(() => { try { xhr.abort(); } catch (_) {} finish(reject, new Error('انتهت مهلة رفع الملف إلى التخزين المحلي.')); }, timeoutMs);
  xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded/e.total)*100)); };
  xhr.onerror = () => finish(reject, new Error('تعذر الاتصال بخدمة الملفات المحلية. تأكد أن npm.cmd start ما زال يعمل.'));
  xhr.onabort = () => finish(reject, new Error('تم إلغاء رفع الملف.'));
  xhr.onload = () => {
    let data={}; try { data=JSON.parse(xhr.responseText||'{}'); } catch (_) {}
    if (xhr.status < 200 || xhr.status >= 300 || !data.url) return finish(reject, new Error(data.message || data.error || `فشل رفع الملف (${xhr.status})`));
    onProgress?.(100); finish(resolve, data);
  };
  xhr.open('POST', `${getApiBase()}/api/files/upload`, true);
  try { xhr.setRequestHeader('Authorization', `Bearer ${await auth.currentUser.getIdToken()}`); }
  catch (_) { finish(reject, new Error('تعذر التحقق من جلسة الدخول.')); return; }
  xhr.send(formData);
});

export const validateDocumentFile = (file, kind = 'cv') => {
  if (!file) return 'اختر ملفاً أولاً.';
  const max = 25 * 1024 * 1024;
  if (file.size > max) return 'حجم الملف يجب ألا يتجاوز 25MB.';
  const allowed = kind === 'cv'
    ? ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    : ['application/pdf','image/jpeg','image/png','application/zip','application/x-zip-compressed'];
  if (!allowed.includes(file.type)) return kind === 'cv' ? 'السيرة الذاتية يجب أن تكون PDF أو Word.' : 'الشهادات يجب أن تكون PDF أو JPG أو PNG أو ZIP.';
  return '';
};
