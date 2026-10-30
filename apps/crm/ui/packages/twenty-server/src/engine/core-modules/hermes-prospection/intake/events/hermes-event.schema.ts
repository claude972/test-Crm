import { z } from 'zod';

const identifier = z.string().trim().min(1).max(200);
const contact = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    firstName: z.string().trim().max(100).default(''),
    lastName: z.string().trim().max(100).default(''),
    companyName: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
const common = {
  version: z.literal('hermes-bridge-v1'),
  eventId: identifier,
  occurredAt: z.string().datetime({ offset: true }),
  contact,
};
export const hermesFormEventSchema = z
  .object({
    ...common,
    provider: z.literal('HEYFORM'),
    event: z
      .object({
        type: z.literal('SUBMISSION_RECEIVED'),
        formId: identifier,
        formName: z.string().trim().min(1).max(200),
        summary: z.string().max(10_000),
      })
      .strict(),
  })
  .strict();
export const hermesCalendarEventSchema = z
  .object({
    ...common,
    provider: z.literal('CAL_DIY'),
    event: z
      .object({
        type: z.literal('BOOKING_CREATED'),
        bookingUid: identifier,
        status: z.literal('ACCEPTED'),
        title: z.string().trim().min(1).max(200),
        startsAt: z.string().datetime({ offset: true }),
        endsAt: z.string().datetime({ offset: true }),
        location: z.string().max(1000).default(''),
      })
      .strict()
      .refine((event) => Date.parse(event.endsAt) > Date.parse(event.startsAt)),
  })
  .strict();
export type HermesBridgeEvent =
  | z.infer<typeof hermesFormEventSchema>
  | z.infer<typeof hermesCalendarEventSchema>;
