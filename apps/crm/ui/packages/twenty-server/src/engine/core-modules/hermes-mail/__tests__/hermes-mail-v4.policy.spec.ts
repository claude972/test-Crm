import { type Email } from 'postal-mime';
import {
  mailThreadKey,
  planMailEnvelope,
  sanitizeMailHtml,
} from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.policy';
const source: Email = {
  headers: [],
  headerLines: [],
  attachments: [],
  from: { name: '', address: 'sender@example.org' },
  replyTo: [{ name: '', address: 'reply@example.org' }],
  to: [
    { name: '', address: 'ME@example.com' },
    { name: '', address: 'other@example.org' },
  ],
  cc: [
    { name: '', address: 'other@example.org' },
    { name: '', address: 'cc@example.org' },
  ],
  bcc: [{ name: '', address: 'hidden@example.org' }],
  messageId: '<last@example.org>',
  references: '<root@example.org>',
  subject: 'Question',
};
const input = {
  mode: 'REPLY_ALL' as const,
  source,
  ownAddresses: ['me@example.com'],
  from: 'me@example.com',
  text: 'Reply',
};
describe('rich mail security policy', () => {
  it('prefers Reply-To, excludes ourselves and deduplicates To/CC without copying Bcc', () => {
    expect(planMailEnvelope(input)).toMatchObject({
      from: 'me@example.com',
      to: ['reply@example.org', 'other@example.org'],
      cc: ['cc@example.org'],
      bcc: [],
      inReplyTo: '<last@example.org>',
      references: ['<root@example.org>', '<last@example.org>'],
    });
  });
  it('replies only to Reply-To by default', () => {
    expect(planMailEnvelope({ ...input, mode: 'REPLY' })).toMatchObject({
      to: ['reply@example.org'],
      cc: [],
    });
  });
  it('forwards to explicit recipients without threading headers or source Bcc', () => {
    const result = planMailEnvelope({
      ...input,
      mode: 'FORWARD',
      to: ['new@example.org'],
      bcc: ['secret@example.org'],
    });
    expect(result).toMatchObject({
      to: ['new@example.org'],
      bcc: ['secret@example.org'],
      references: [],
      subject: 'Fwd: Question',
    });
    expect(result.inReplyTo).toBeUndefined();
  });
  it('rejects another sender even in the mailbox domain', () => {
    expect(() =>
      planMailEnvelope({ ...input, from: 'admin@example.com' }),
    ).toThrow('MAIL_SENDER_NOT_VERIFIED');
  });
  it('rejects CRLF headers and recipient injection', () => {
    expect(() =>
      planMailEnvelope({
        ...input,
        source: { ...source, subject: 'x\r\nBcc:evil@example.org' },
      }),
    ).toThrow('MAIL_INVALID_HEADER');
    expect(() =>
      planMailEnvelope({
        ...input,
        bcc: ['x@example.org\r\nBcc:evil@example.org'],
      }),
    ).toThrow('MAIL_INVALID_RECIPIENT');
  });
  it('allows verified aliases but removes them from reply-all', () => {
    expect(
      planMailEnvelope({
        ...input,
        ownAddresses: ['me@example.com', 'other@example.org'],
        from: 'other@example.org',
      }),
    ).toMatchObject({ to: ['reply@example.org'], cc: ['cc@example.org'] });
  });
  it('blocks scripts, event handlers, SVG, remote image/CSS tracking and unsafe links', () => {
    const html = sanitizeMailHtml(
      '<script>alert(1)</script><svg onload="x()"></svg><img src="https://track.example/x"><img src="cid:private"><p style="background:url(https://track.example/x)" onclick="x()">Hello</p><a href="javascript:alert(1)">bad</a><a href="https://example.org">ok</a>',
    );
    expect(html).not.toMatch(
      /script|svg|img|style|onclick|javascript:|track\.example/,
    );
    expect(html).toContain('noopener noreferrer nofollow');
    expect(html).toContain('Hello');
  });
  it('never groups unrelated messages by matching subject', () => {
    expect(mailThreadKey(source, input.ownAddresses)).not.toBe(
      mailThreadKey(
        {
          ...source,
          messageId: '<different@example.org>',
          references: undefined,
        },
        input.ownAddresses,
      ),
    );
  });
  it('scopes reference headers by participants', () => {
    expect(mailThreadKey(source, input.ownAddresses)).not.toBe(
      mailThreadKey(
        { ...source, from: { name: '', address: 'attacker@example.org' } },
        input.ownAddresses,
      ),
    );
  });
  it('does not invent a thread without an RFC identifier', () => {
    expect(
      mailThreadKey(
        { ...source, messageId: undefined, references: undefined },
        input.ownAddresses,
      ),
    ).toBeNull();
  });
});
