import { readClientBookingAttendeeResponse } from '@/client-context/utils/readClientBookingAttendeeResponse';

describe('readClientBookingAttendeeResponse', () => {
  it('maps the four values the native participant object defines', () => {
    expect(readClientBookingAttendeeResponse('ACCEPTED')).toBe('accepted');
    expect(readClientBookingAttendeeResponse('DECLINED')).toBe('declined');
    expect(readClientBookingAttendeeResponse('NEEDS_ACTION')).toBe(
      'needs-action',
    );
    expect(readClientBookingAttendeeResponse('TENTATIVE')).toBe('tentative');
  });

  // The defect this guards against: a lowercase-and-hyphenate transformation
  // accepting a value the native object never defines and rendering it as a
  // real answer.
  it('reports a value outside the four as unknown', () => {
    expect(readClientBookingAttendeeResponse('MAYBE')).toBeNull();
    expect(readClientBookingAttendeeResponse('accepted')).toBeNull();
    expect(readClientBookingAttendeeResponse('')).toBeNull();
  });

  it('reports a non-string as unknown rather than as no answer', () => {
    expect(readClientBookingAttendeeResponse(null)).toBeNull();
    expect(readClientBookingAttendeeResponse(undefined)).toBeNull();
    expect(readClientBookingAttendeeResponse(1)).toBeNull();
  });
});
