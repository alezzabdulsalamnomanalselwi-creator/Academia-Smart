const crypto = require('crypto');

const deterministicId = (prefix, value) => {
  const digest = crypto.createHash('sha256').update(String(value || '')).digest('hex');
  return `${prefix}_${digest}`;
};

const ratingRequestId = interviewId => deterministicId('rating_request', interviewId);
const ratingDocumentId = interviewId => deterministicId('rating', interviewId);
const ratingResultNotificationId = ratingId => deterministicId('rating_result', ratingId);

const normalizeRatingInput = body => {
  const rating = Number(body?.rating);
  const comment = String(body?.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'INVALID_RATING_SCORE' };
  }
  if (!comment || comment.length > 2000) return { error: 'INVALID_RATING_COMMENT' };
  return { rating, comment };
};

const validateRatingRelations = ({ request, interview, application, actorId }) => {
  if (!request || request.type !== 'rating_request') return 'INVALID_RATING_REQUEST';
  if (request.recruiterId !== actorId || request.receiver?.id !== actorId) return 'RATING_ACCESS_DENIED';
  if (request.status !== 'accepted' && request.businessStatus !== 'accepted') return 'RATING_REQUEST_NOT_ACCEPTED';
  if (!interview || interview.status !== 'completed') return 'INTERVIEW_NOT_COMPLETED';
  if (!application) return 'APPLICATION_NOT_FOUND';
  if (interview.applicationId !== application.id
    || interview.candidateId !== request.lecturerId
    || interview.recruiterId !== actorId
    || application.applicantId !== request.lecturerId
    || application.recruiterId !== actorId) return 'RATING_RELATION_MISMATCH';
  return '';
};

module.exports = {
  normalizeRatingInput,
  ratingDocumentId,
  ratingRequestId,
  ratingResultNotificationId,
  validateRatingRelations
};
