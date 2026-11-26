export const cleanAcademicValue = (value) => {
  if (value == null) return '';
  const v = String(value).trim();
  if (!v || v === 'undefined' || v.endsWith('.undefined')) return '';
  return v;
};

export const academicLabel = (value, t, prefix = 'departments') => {
  const v = cleanAcademicValue(value);
  if (!v) return t?.('common.notSpecified') || 'غير محدد';
  const key = `${prefix}.${v}`;
  const translated = t?.(key);
  return translated && translated !== key ? translated : v;
};
