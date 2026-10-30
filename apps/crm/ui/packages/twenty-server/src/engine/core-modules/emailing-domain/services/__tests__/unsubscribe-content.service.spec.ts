import { UnsubscribeContentService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-content.service';
import { type UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { type EmailingDomainSendEmailInput } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-input.type';
import { type EmailingDomainSendEmailBatchInput } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-send-email-batch-input.type';

jest.mock(
  'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service',
  () => ({ UnsubscribeTokenService: class UnsubscribeTokenService {} }),
);

const input = (
  to = ['Synthetic Recipient <Person@Example.test>'],
): EmailingDomainSendEmailInput => ({
  workspaceId: 'workspace-a',
  domain: 'example.test',
  from: 'sender@example.test',
  sendKind: 'MARKETING',
  to,
  subject: 'Synthetic subject',
  text: 'Synthetic text',
  html: '<p>Synthetic text</p>',
});
const batch = (): EmailingDomainSendEmailBatchInput => ({
  workspaceId: 'workspace-a',
  domain: 'example.test',
  from: 'sender@example.test',
  sendKind: 'MARKETING',
  template: {
    subject: 'Hello {{name}}',
    text: 'Text {{name}}',
    html: '<p>Text {{name}}</p>',
  },
  recipients: [
    { email: 'alice@example.test', replacements: { name: 'Alice' } },
    { email: 'bob@example.test', replacements: { name: 'Bob' } },
  ],
});
const setup = () => {
  const sign = jest.fn().mockReturnValue('synthetic-opaque-token');
  const service = new UnsubscribeContentService({
    sign,
  } as unknown as UnsubscribeTokenService);

  return { service, sign };
};

describe('Unsubscribe content canonical identity', () => {
  it('signs a bare normalized single-recipient identity while preserving display headers', () => {
    const { service, sign } = setup();
    const email = input();
    const result = service.addTo(email, 'https://crm.example.test');

    expect(sign).toHaveBeenCalledWith({
      workspaceId: 'workspace-a',
      emailAddress: 'person@example.test',
    });
    expect(result.to).toEqual(email.to);
    expect(result.from).toBe(email.from);
    expect(result.text).toContain(
      'https://crm.example.test/emailing/unsubscribe?t=synthetic-opaque-token',
    );
    expect(
      result.headers?.filter(
        (header) => header.name.toLowerCase() === 'list-unsubscribe',
      ),
    ).toHaveLength(1);
  });

  it('gives every native provider the same canonical token without changing a bare batch audience or replacements', () => {
    const { service, sign } = setup();
    const source = batch();
    const original = structuredClone(source);
    const result = service.addToBatch(source, 'https://crm.example.test');

    expect(sign.mock.calls.map(([payload]) => payload.emailAddress)).toEqual([
      'alice@example.test',
      'bob@example.test',
    ]);
    expect(result.recipients.map((recipient) => recipient.email)).toEqual([
      'alice@example.test',
      'bob@example.test',
    ]);
    expect(
      result.recipients.map((recipient) => recipient.replacements.name),
    ).toEqual(['Alice', 'Bob']);
    expect(source).toEqual(original);
  });

  it('normalizes a batch token without mutating the provider recipient value', () => {
    const { service, sign } = setup();
    const source = batch();

    source.recipients[0].email = 'Person@Example.test';
    const result = service.addToBatch(source, 'https://crm.example.test');

    expect(sign.mock.calls[0][0].emailAddress).toBe('person@example.test');
    expect(result.recipients[0].email).toBe('Person@Example.test');
  });

  it('validates the complete batch before signing any token', () => {
    const { service, sign } = setup();
    const source = batch();

    source.recipients[1].email = 'one@example.test, two@example.test';
    expect(() =>
      service.addToBatch(source, 'https://crm.example.test'),
    ).toThrow();
    expect(sign).not.toHaveBeenCalled();
  });

  it.each([
    { ...input(), sendKind: 'TRANSACTIONAL' as const },
    { ...batch(), sendKind: 'TRANSACTIONAL' as const },
  ])(
    'leaves transactional input untouched and signs no marketing token',
    (source) => {
      const { service, sign } = setup();
      const result =
        'to' in source
          ? service.addTo(source, null)
          : service.addToBatch(source, null);

      expect(result).toBe(source);
      expect(sign).not.toHaveBeenCalled();
    },
  );
});
