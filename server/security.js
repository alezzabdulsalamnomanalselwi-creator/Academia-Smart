const path = require('path');

const MIME_TO_EXTENSIONS = new Map([
  ['application/pdf', ['.pdf']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['application/zip', ['.zip']],
  ['application/x-zip-compressed', ['.zip']]
]);

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const sanitizeSegment = value => String(value || 'general').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'general';
const safeOriginalName = value => path.basename(String(value || 'file')).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 180) || 'file';

const isExtensionAllowed = (mime, originalName) => {
  const allowed = MIME_TO_EXTENSIONS.get(String(mime || '').toLowerCase());
  return Boolean(allowed && allowed.includes(path.extname(originalName || '').toLowerCase()));
};

const hasAllowedSignature = (buffer, mime) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) return false;
  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase();
  const ascii = buffer.subarray(0, 8).toString('ascii');
  switch (String(mime || '').toLowerCase()) {
    case 'application/pdf': return ascii.startsWith('%PDF-');
    case 'image/jpeg': return hex.startsWith('ffd8ff');
    case 'image/png': return hex.startsWith('89504e470d0a1a0a');
    case 'application/msword': return hex.startsWith('d0cf11e0a1b11ae1');
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/zip':
    case 'application/x-zip-compressed':
      return hex.startsWith('504b0304') || hex.startsWith('504b0506') || hex.startsWith('504b0708');
    default: return false;
  }
};

const resolvePathWithinRoot = (root, relativePath) => {
  const rootPath = path.resolve(root);
  const decoded = String(relativePath || '').split('/').map(part => decodeURIComponent(part)).join(path.sep);
  const resolved = path.resolve(rootPath, decoded);
  if (resolved !== rootPath && !resolved.startsWith(`${rootPath}${path.sep}`)) return null;
  return resolved;
};

const isLegacySuperAdmin = data => data?.role === 'admin'
  && !Object.prototype.hasOwnProperty.call(data, 'adminLevel')
  && !Array.isArray(data?.permissions);

const isSuperAdmin = data => data?.role === 'admin'
  && (data?.adminLevel === 'super' || data?.isSuperAdmin === true || isLegacySuperAdmin(data));

const hasPermission = (data, permission) => isSuperAdmin(data)
  || (data?.role === 'admin' && Array.isArray(data?.permissions)
    && (data.permissions.includes('*') || data.permissions.includes(permission)));

module.exports = {
  MIME_TO_EXTENSIONS,
  hasAllowedSignature,
  hasPermission,
  isExtensionAllowed,
  isLegacySuperAdmin,
  isSuperAdmin,
  normalizeEmail,
  resolvePathWithinRoot,
  safeOriginalName,
  sanitizeSegment
};
