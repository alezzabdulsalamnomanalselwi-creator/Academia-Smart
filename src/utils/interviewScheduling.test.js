import { hasActiveInterview, hasInterviewConflict, interviewDocumentId, interviewStatusLabel } from './interviewScheduling';

describe('interview scheduling contract', () => {
  const interviews = [{ id: 'i1', applicationId: 'a1', recruiterId: 'r1', status: 'scheduled', date: '2026-12-15', time: '10:00' }];

  test('uses one deterministic interview ID per application', () => {
    expect(interviewDocumentId('application:a/1')).toBe('interview_application_a_1');
  });

  test('prevents a second active interview for the same application', () => {
    expect(hasActiveInterview(interviews, 'a1')).toBe(true);
    expect(hasActiveInterview(interviews, 'a2')).toBe(false);
    expect(hasActiveInterview(interviews, 'a1', 'i1')).toBe(false);
  });

  test('detects a recruiter conflict inside the 45 minute window', () => {
    expect(hasInterviewConflict(interviews, { applicationId: 'a2', recruiterId: 'r1', date: '2026-12-15', time: '10:30' })).toBe(true);
    expect(hasInterviewConflict(interviews, { applicationId: 'a2', recruiterId: 'r1', date: '2026-12-15', time: '11:00' })).toBe(false);
  });

  test.each(['scheduled', 'rescheduled', 'completed', 'cancelled', 'no_show'])('localizes %s', status => {
    expect(interviewStatusLabel(status)).not.toBe(status);
  });
});
