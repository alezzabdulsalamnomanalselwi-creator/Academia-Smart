const encoded = value => encodeURIComponent(String(value || ''));

export const resolveNotificationDeepLink = (notification = {}, role = '') => {
  if (notification.deepLink) return notification.deepLink;
  const documentId = notification.documentId || notification.relatedId;
  const applicationId = notification.applicationId || notification.relatedId;
  if (role === 'recruiter' && notification.type === 'document_uploaded' && documentId) {
    return `/recruiter-dashboard?section=documents&documentId=${encoded(documentId)}`;
  }
  if (role === 'lecturer' && ['document_approved', 'document_rejected', 'document_review'].includes(notification.type) && documentId) {
    return `/lecturer-dashboard?section=upload&documentId=${encoded(documentId)}`;
  }
  if (role === 'recruiter' && ['application', 'application_submitted'].includes(notification.type) && applicationId) {
    return `/recruiter-dashboard?section=applications&applicationId=${encoded(applicationId)}`;
  }
  if (role === 'lecturer' && ['application_status', 'application_status_changed'].includes(notification.type) && applicationId) {
    return `/lecturer-dashboard?section=applications&applicationId=${encoded(applicationId)}`;
  }
  const interviewId = notification.interviewId || notification.relatedId;
  if (role === 'lecturer' && ['interview', 'interview_scheduled', 'interview_rescheduled', 'interview_updated', 'interview_status', 'interview_cancelled'].includes(notification.type) && interviewId) {
    return `/lecturer-dashboard?section=interviews&interviewId=${encoded(interviewId)}`;
  }
  const requestId = notification.requestId || (notification.type === 'rating_request' ? notification.id : '');
  if (role === 'recruiter' && notification.type === 'rating_request' && requestId) {
    return `/recruiter-dashboard?section=ratings&requestId=${encoded(requestId)}`;
  }
  const ratingId = notification.ratingId || notification.relatedId;
  if (role === 'lecturer' && ['rating_received', 'rating_result'].includes(notification.type) && ratingId) {
    return `/lecturer-dashboard?section=ratings&ratingId=${encoded(ratingId)}`;
  }
  return '';
};
