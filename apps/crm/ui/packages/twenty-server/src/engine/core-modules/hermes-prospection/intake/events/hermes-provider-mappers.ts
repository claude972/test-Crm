import { z } from 'zod';

import {
  hermesFormEventSchema,
  hermesCalendarEventSchema,
} from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.schema';

// HeyForm's native webhookPayload(submission, form) has no signature or event
// timestamp. The controlled bridge must authenticate its source and supply the
// observed receipt time; this is not a claimed provider creation timestamp.
export const mapHeyFormSubmission = (
  raw: unknown,
  options: {
    receivedAt: string;
    emailFieldId: string;
    firstNameFieldId?: string;
    lastNameFieldId?: string;
    companyFieldId?: string;
  },
) => {
  const payload = z
    .object({
      id: z.string(),
      formId: z.string(),
      formName: z.string(),
      fields: z.array(z.unknown()).max(200).optional(),
      answers: z
        .array(
          z
            .object({
              id: z.string(),
              title: z.string().max(200),
              value: z.unknown(),
            })
            .passthrough(),
        )
        .max(200),
      hiddenFields: z.array(z.unknown()).max(200).optional(),
      variables: z.array(z.unknown()).max(200).optional(),
      ip: z.string().optional(),
    })
    .strict()
    .parse(raw);
  if (
    new Set(payload.answers.map((answer) => answer.id)).size !==
    payload.answers.length
  )
    throw new Error('Ambiguous form answer');
  const field = (id?: string) => {
    if (!id) return undefined;
    const answer = payload.answers.find((value) => value.id === id);
    if (!answer || typeof answer.value !== 'string')
      throw new Error('Configured form field unavailable');
    return answer.value;
  };
  const summary = payload.answers
    .map(
      (answer) =>
        `${answer.title}: ${typeof answer.value === 'string' ? answer.value : '[non-text answer omitted]'}`,
    )
    .join('\n');
  return hermesFormEventSchema.parse({
    version: 'hermes-bridge-v1',
    provider: 'HEYFORM',
    eventId: payload.id,
    occurredAt: options.receivedAt,
    contact: {
      email: field(options.emailFieldId),
      firstName: field(options.firstNameFieldId),
      lastName: field(options.lastNameFieldId),
      companyName: field(options.companyFieldId),
    },
    event: {
      type: 'SUBMISSION_RECEIVED',
      formId: payload.formId,
      formName: payload.formName,
      summary,
    },
  });
};

// Cal.diy 56da01b / default webhook version 2021-10-20: sendPayload.ts wraps
// BookingPayloadBuilder's accepted booking in {triggerEvent,createdAt,payload}.
// Customized templates and requested/unconfirmed bookings are unsupported.
export const mapCalDiyBooking = (
  raw: unknown,
  options: { attendeeEmail: string; companyName?: string },
) => {
  const payload = z
    .object({
      triggerEvent: z.enum([
        'BOOKING_CREATED',
        'BOOKING_RESCHEDULED',
        'BOOKING_CANCELLED',
      ]),
      createdAt: z.string(),
      payload: z
        .object({
          uid: z.string(),
          rescheduleUid: z.string().optional(),
          status: z.enum(['ACCEPTED', 'CANCELLED']),
          title: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          location: z.string().optional(),
          attendees: z
            .array(
              z
                .object({
                  email: z.string().email(),
                  firstName: z.string().optional(),
                  lastName: z.string().optional(),
                  name: z.string().optional(),
                })
                .passthrough(),
            )
            .min(1)
            .max(100),
        })
        .passthrough(),
    })
    .passthrough()
    .parse(raw);
  const matches = payload.payload.attendees.filter(
    (attendee) =>
      attendee.email.toLowerCase() ===
      options.attendeeEmail.trim().toLowerCase(),
  );
  if (matches.length !== 1)
    throw new Error('Configured booking attendee unavailable');
  const attendee = matches[0];
  return hermesCalendarEventSchema.parse({
    version: 'hermes-bridge-v1',
    provider: 'CAL_DIY',
    eventId: `${payload.payload.uid}:${payload.triggerEvent}:${payload.createdAt}`,
    occurredAt: payload.createdAt,
    contact: {
      email: attendee.email,
      firstName: attendee.firstName ?? attendee.name ?? '',
      lastName: attendee.lastName ?? '',
      companyName: options.companyName,
    },
    event: {
      type: payload.triggerEvent,
      bookingUid: payload.payload.uid,
      ...(payload.triggerEvent === 'BOOKING_RESCHEDULED' &&
      payload.payload.rescheduleUid &&
      payload.payload.rescheduleUid !== payload.payload.uid
        ? { previousBookingUid: payload.payload.rescheduleUid }
        : {}),
      status: payload.payload.status,
      title: payload.payload.title,
      startsAt: payload.payload.startTime,
      endsAt: payload.payload.endTime,
      location: payload.payload.location ?? '',
    },
  });
};
