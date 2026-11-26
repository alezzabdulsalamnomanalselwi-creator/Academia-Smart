const statusLabels = {
  active: { ar: 'نشط', en: 'Active' }, blocked: { ar: 'محظور', en: 'Blocked' }, suspended: { ar: 'موقوف', en: 'Suspended' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' }, under_review: { ar: 'قيد المراجعة', en: 'Under Review' },
  interview_scheduled: { ar: 'مقابلة مجدولة', en: 'Interview Scheduled' }, scheduled: { ar: 'مجدولة', en: 'Scheduled' }, rescheduled: { ar: 'أُعيدت الجدولة', en: 'Rescheduled' },
  completed: { ar: 'مكتمل', en: 'Completed' }, approved: { ar: 'معتمد', en: 'Approved' }, rejected: { ar: 'مرفوض', en: 'Rejected' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' }, no_show: { ar: 'عدم حضور', en: 'No show' }, open: { ar: 'مفتوحة', en: 'Open' }, closed: { ar: 'مغلقة', en: 'Closed' }, archived: { ar: 'مؤرشفة', en: 'Archived' }, paused: { ar: 'متوقفة', en: 'Paused' }
};

export const statusLabel = (value, language = 'ar') => statusLabels[value]?.[language === 'ar' ? 'ar' : 'en'] || String(value || '—');
