import { resolveNotificationDeepLink } from './notificationRouting';

describe('notification deep-link routing', () => {
  test('preserves an explicit deep link', () => {
    expect(resolveNotificationDeepLink({ deepLink: '/explicit' }, 'recruiter')).toBe('/explicit');
  });

  test('routes document upload to the exact recruiter document', () => {
    expect(resolveNotificationDeepLink({ type: 'document_uploaded', documentId: 'doc 1' }, 'recruiter'))
      .toBe('/recruiter-dashboard?section=documents&documentId=doc%201');
  });

  test.each(['document_approved', 'document_rejected', 'document_review'])(
    'routes %s to the exact lecturer document', type => {
      expect(resolveNotificationDeepLink({ type, documentId: 'doc-2' }, 'lecturer'))
        .toBe('/lecturer-dashboard?section=upload&documentId=doc-2');
    }
  );

  test('does not invent a route without a target', () => {
    expect(resolveNotificationDeepLink({ type: 'document_uploaded' }, 'recruiter')).toBe('');
  });

  test.each(['interview', 'interview_scheduled', 'interview_rescheduled', 'interview_updated', 'interview_status', 'interview_cancelled'])(
    'routes %s to the exact lecturer interview', type => {
      expect(resolveNotificationDeepLink({ type, interviewId: 'interview 1' }, 'lecturer'))
        .toBe('/lecturer-dashboard?section=interviews&interviewId=interview%201');
    }
  );

  test('routes a recruiter rating request to the exact request', () => {
    expect(resolveNotificationDeepLink({ id: 'request-1', type: 'rating_request', requestId: 'request-1' }, 'recruiter'))
      .toBe('/recruiter-dashboard?section=ratings&requestId=request-1');
  });

  test('routes a lecturer rating result to the exact rating', () => {
    expect(resolveNotificationDeepLink({ type: 'rating_received', ratingId: 'rating-1' }, 'lecturer'))
      .toBe('/lecturer-dashboard?section=ratings&ratingId=rating-1');
  });
});
