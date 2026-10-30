import { messagingEventSchema } from '../hermes-messaging.policy';
const event = {
  workspaceId: '7b34812f-3275-4166-8e71-602347350d23',
  channel: 'EMAIL',
  direction: 'INBOUND',
  kind: 'EMAIL',
  attachmentIds: [],
  providerConnectionId: 'native-mail',
  providerConversationId: 'thread',
  providerMessageId: 'physical',
  contactHandle: 'client@example.com',
  text: 'Mail',
  occurredAt: '2026-10-30T12:00:00.000Z',
};
it('accepts optional server MIME SHA256 only as canonical64hex metadata', () => {
  expect(messagingEventSchema.safeParse(event).success).toBe(true);
  expect(
    messagingEventSchema.safeParse({
      ...event,
      providerMetadata: { mimeSha256: 'a'.repeat(64) },
    }).success,
  ).toBe(true);
  for (const mimeSha256 of [
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    'g'.repeat(64),
    'https://example.com/content',
  ])
    expect(
      messagingEventSchema.safeParse({
        ...event,
        providerMetadata: { mimeSha256 },
      }).success,
    ).toBe(false);
});
it('keeps unknown raw MIME/envelope payloads out of provider metadata', () => {
  expect(
    messagingEventSchema.safeParse({
      ...event,
      providerMetadata: {
        mimeSha256: 'a'.repeat(64),
        rawMime: 'untrusted bytes',
      },
    }).success,
  ).toBe(false);
  expect(
    messagingEventSchema.safeParse({
      ...event,
      providerMetadata: {
        mimeSha256: 'a'.repeat(64),
        bcc: ['private@example.com'],
      },
    }).success,
  ).toBe(false);
});

it('allows only bounded native Sent-copy outcomes, with no client proof or envelope secret fields', () => {
  for (const sentCopyState of ['PENDING', 'UNCONFIRMED', 'SAVED'])
    expect(
      messagingEventSchema.safeParse({
        ...event,
        providerMetadata: { sentCopyState },
      }).success,
    ).toBe(true);
  expect(
    messagingEventSchema.safeParse({
      ...event,
      providerMetadata: { sentCopyState: 'ACCEPTED' },
    }).success,
  ).toBe(false);
});
