import { statusLabel } from './displayLabels';
import { resolveTheme } from '../context/ThemeContext';

describe('presentation labels and theme resolution', () => {
  test.each([
    ['active', 'ar', 'نشط'], ['active', 'en', 'Active'], ['under_review', 'ar', 'قيد المراجعة'], ['under_review', 'en', 'Under Review'], ['interview_scheduled', 'en', 'Interview Scheduled']
  ])('maps %s for %s', (value, language, expected) => expect(statusLabel(value, language)).toBe(expected));
  test('keeps unknown values visible rather than mutating data', () => expect(statusLabel('legacy_value', 'en')).toBe('legacy_value'));
  test('resolves explicit and system theme modes deterministically', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });
});
