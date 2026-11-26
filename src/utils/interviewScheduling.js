export const interviewDocumentId = applicationId => `interview_${String(applicationId || '').replace(/[^A-Za-z0-9_-]/g, '_')}`;

export const hasActiveInterview = (interviews = [], applicationId, ignoreId = '') => interviews.some(item =>
  item.id !== ignoreId
  && item.applicationId === applicationId
  && ['scheduled', 'rescheduled'].includes(item.status)
);

export const hasInterviewConflict = (interviews = [], candidate = {}, windowMinutes = 45) => {
  const target = new Date(`${candidate.date}T${candidate.time}`);
  if (Number.isNaN(target.getTime())) return false;
  return interviews.some(item => {
    if (item.id === candidate.ignoreId || !['scheduled', 'rescheduled'].includes(item.status)) return false;
    const scheduled = new Date(item.scheduledAt || `${item.date}T${item.time}`);
    if (Number.isNaN(scheduled.getTime())) return false;
    const sameParty = item.applicationId === candidate.applicationId || item.recruiterId === candidate.recruiterId;
    return sameParty && Math.abs(scheduled - target) < windowMinutes * 60 * 1000;
  });
};

export const interviewStatusLabel = status => ({
  scheduled: 'مجدولة', rescheduled: 'أعيدت جدولتها', completed: 'مكتملة',
  cancelled: 'ملغاة', no_show: 'لم يحضر'
}[status] || status);
