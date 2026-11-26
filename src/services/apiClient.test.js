import { auth } from '../firebase/config';
import { apiRequest, fileAccessErrorMessage, openProtectedFile } from './apiClient';

jest.mock('../firebase/config', () => ({ auth: { currentUser: null } }));

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body)
});

const fileReply = (status, body = {}) => ({
  ...reply(status, body),
  blob: jest.fn().mockResolvedValue(new Blob(['synthetic-pdf'], { type: 'application/pdf' }))
});

describe('authenticated API token refresh', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    auth.currentUser = null;
    window.open = jest.fn().mockReturnValue({});
    URL.createObjectURL = jest.fn().mockReturnValue('blob:academia-smart-file');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('uses the cached Firebase ID token for a successful privileged request', async () => {
    const getIdToken = jest.fn().mockResolvedValue('cached-token');
    auth.currentUser = { uid: 'super-admin', getIdToken };
    global.fetch.mockResolvedValue(reply(200, { ok: true }));

    await expect(apiRequest('/api/admin/probe')).resolves.toEqual({ ok: true });

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getIdToken).toHaveBeenCalledWith(false);
    expect(global.fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer cached-token');
  });

  test('forces one token refresh and retries once after a 401', async () => {
    const getIdToken = jest.fn()
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('fresh-token');
    auth.currentUser = { uid: 'super-admin', getIdToken };
    global.fetch
      .mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN' }))
      .mockResolvedValueOnce(reply(200, { ok: true }));

    await expect(apiRequest('/api/admin/probe')).resolves.toEqual({ ok: true });

    expect(getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  test('does not retry indefinitely when the refreshed token is rejected', async () => {
    const getIdToken = jest.fn()
      .mockResolvedValueOnce('stale-token')
      .mockResolvedValueOnce('rejected-fresh-token');
    auth.currentUser = { uid: 'super-admin', getIdToken };
    global.fetch
      .mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN' }))
      .mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN', message: 'جلسة الدخول غير صالحة أو منتهية.' }));

    await expect(apiRequest('/api/admin/probe')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
      status: 401
    });
    expect(getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('does not refresh for an authorization denial', async () => {
    const getIdToken = jest.fn().mockResolvedValue('valid-token');
    auth.currentUser = { uid: 'limited-admin', getIdToken };
    global.fetch.mockResolvedValue(reply(403, { code: 'PERMISSION_DENIED' }));

    await expect(apiRequest('/api/admin/probe')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      status: 403
    });
    expect(getIdToken.mock.calls).toEqual([[false]]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('rejects an authenticated request when no current user exists', async () => {
    await expect(apiRequest('/api/admin/probe')).rejects.toThrow('يلزم تسجيل الدخول');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('opens a protected Document request through an authenticated Blob fetch', async () => {
    const getIdToken = jest.fn().mockResolvedValue('recruiter-token');
    auth.currentUser = { uid: 'recruiter-01', getIdToken };
    global.fetch.mockResolvedValue(fileReply(200));

    await openProtectedFile('http://localhost:5050/uploads/lecturer-01/document.pdf', { documentId: 'document-01' });

    expect(global.fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer recruiter-token');
    expect(global.fetch.mock.calls[0][1].headers.get('X-Document-Id')).toBe('document-01');
    expect(window.open).toHaveBeenCalledWith('blob:academia-smart-file', '_blank', 'noopener,noreferrer');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  test('refreshes once before opening a protected CV after a 401', async () => {
    const getIdToken = jest.fn().mockResolvedValueOnce('stale-token').mockResolvedValueOnce('fresh-token');
    auth.currentUser = { uid: 'recruiter-01', getIdToken };
    global.fetch.mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN' })).mockResolvedValueOnce(fileReply(200));

    await openProtectedFile('http://localhost:5050/uploads/lecturer-01/cv.pdf');

    expect(getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  test('stops after one forced refresh when a protected file still returns 401', async () => {
    const getIdToken = jest.fn().mockResolvedValueOnce('stale-token').mockResolvedValueOnce('rejected-fresh-token');
    auth.currentUser = { uid: 'recruiter-01', getIdToken };
    global.fetch.mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN' })).mockResolvedValueOnce(reply(401, { code: 'INVALID_TOKEN' }));

    await expect(openProtectedFile('http://localhost:5050/uploads/lecturer-01/cv.pdf')).rejects.toMatchObject({ status: 401 });

    expect(getIdToken.mock.calls).toEqual([[false], [true]]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(fileAccessErrorMessage({ status: 401 })).toMatch('جلسة الدخول غير صالحة أو منتهية');
    expect(fileAccessErrorMessage({ status: 500 })).toMatch('خدمة الملفات');
  });

  test('keeps authorization denials distinct from expired sessions', async () => {
    const getIdToken = jest.fn().mockResolvedValue('valid-token');
    auth.currentUser = { uid: 'unrelated-user', getIdToken };
    global.fetch.mockResolvedValue(fileReply(403, { code: 'FILE_ACCESS_DENIED' }));

    await expect(openProtectedFile('http://localhost:5050/uploads/lecturer-01/cv.pdf')).rejects.toMatchObject({ status: 403 });
    expect(getIdToken).toHaveBeenCalledWith(false);
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(fileAccessErrorMessage({ status: 403 })).toBe('ليست لديك صلاحية فتح هذا الملف.');
    expect(fileAccessErrorMessage({ status: 404 })).toBe('الملف غير متوفر أو تم نقله.');
  });

  test('releases the Blob URL when the browser blocks the new tab', async () => {
    const getIdToken = jest.fn().mockResolvedValue('recruiter-token');
    auth.currentUser = { uid: 'recruiter-01', getIdToken };
    window.open.mockReturnValue(null);
    global.fetch.mockResolvedValue(fileReply(200));

    await openProtectedFile('http://localhost:5050/uploads/lecturer-01/cv.pdf');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:academia-smart-file');
  });
});
