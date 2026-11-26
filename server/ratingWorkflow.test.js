const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRatingInput,
  ratingDocumentId,
  ratingRequestId,
  ratingResultNotificationId,
  validateRatingRelations
} = require('./ratingWorkflow');

test('rating workflow uses stable per-interview/request IDs', () => {
  assert.equal(ratingRequestId('interview-a'), ratingRequestId('interview-a'));
  assert.equal(ratingDocumentId('interview-a'), ratingDocumentId('interview-a'));
  assert.notEqual(ratingRequestId('interview-a'), ratingRequestId('interview-b'));
  assert.equal(ratingResultNotificationId('rating-a'), ratingResultNotificationId('rating-a'));
});

test('rating score accepts integers 1..5 and rejects out-of-range/non-integers', () => {
  assert.deepEqual(normalizeRatingInput({ rating: 4, comment: 'تقييم مهني' }), { rating: 4, comment: 'تقييم مهني' });
  for (const rating of [-1, 0, 6, 9, 2.5, 'bad']) {
    assert.equal(normalizeRatingInput({ rating, comment: 'x' }).error, 'INVALID_RATING_SCORE');
  }
});

test('rating relations require accepted request, completed interview, and owned application', () => {
  const request = { type: 'rating_request', status: 'accepted', recruiterId: 'recruiter-a', lecturerId: 'lecturer-a', receiver: { id: 'recruiter-a' } };
  const interview = { id: 'interview-a', status: 'completed', applicationId: 'application-a', candidateId: 'lecturer-a', recruiterId: 'recruiter-a' };
  const application = { id: 'application-a', applicantId: 'lecturer-a', recruiterId: 'recruiter-a' };
  assert.equal(validateRatingRelations({ request, interview, application, actorId: 'recruiter-a' }), '');
  assert.equal(validateRatingRelations({ request, interview: { ...interview, status: 'scheduled' }, application, actorId: 'recruiter-a' }), 'INTERVIEW_NOT_COMPLETED');
  assert.equal(validateRatingRelations({ request, interview, application, actorId: 'recruiter-b' }), 'RATING_ACCESS_DENIED');
  assert.equal(validateRatingRelations({ request, interview, application: { ...application, applicantId: 'lecturer-b' }, actorId: 'recruiter-a' }), 'RATING_RELATION_MISMATCH');
});
