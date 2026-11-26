import { validateDocumentFile } from './utils/fileUpload';

describe('Phase 1 document validation', () => {
  test('accepts a PDF at the 25MB boundary', () => {
    expect(validateDocumentFile({ size: 25 * 1024 * 1024, type: 'application/pdf' }, 'cv')).toBe('');
  });

  test('rejects a file larger than 25MB', () => {
    expect(validateDocumentFile({ size: (25 * 1024 * 1024) + 1, type: 'application/pdf' }, 'cv')).toContain('25MB');
  });

  test('rejects an executable masquerading as a CV', () => {
    expect(validateDocumentFile({ size: 100, type: 'application/x-msdownload' }, 'cv')).toContain('PDF');
  });
});
