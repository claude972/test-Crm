import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { type Address, type Email } from 'postal-mime';
import sanitizeHtml from 'sanitize-html';

import {
  mailAddress,
  mailMessageId,
} from 'src/engine/core-modules/hermes-mail/hermes-mail.policy';

export const MAIL_MAX_SOURCE_BYTES = 36 * 1024 * 1024;
export const MAIL_MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024;
export type HermesMailEnvelope = {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references: string[];
};
export const mailHeader = (value: string, max = 512) => {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\r\n\x00-\x1f\x7f]/.test(value)
  )
    throw new BadRequestException('MAIL_INVALID_HEADER');
  return value;
};
export const mailAddresses = (addresses: Address[] | undefined): string[] => [
  ...new Set(
    (addresses ?? [])
      .flatMap((item) => item.group ?? [item])
      .map((item) => mailAddress(item.address))
      .filter((item): item is string => item !== null),
  ),
];

export function sanitizeMailHtml(value: string | undefined) {
  if (!value) return '';
  if (Buffer.byteLength(value) > 1024 * 1024)
    throw new BadRequestException('MAIL_HTML_TOO_LARGE');
  // CSS and image sources can leak reads even when scripts have been removed.
  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'br',
      'div',
      'span',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'table',
      'tbody',
      'thead',
      'tr',
      'td',
      'th',
      'hr',
      'a',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
    },
  });
}

export function planMailEnvelope(input: {
  mode: 'NEW' | 'REPLY' | 'REPLY_ALL' | 'FORWARD';
  source: Email;
  ownAddresses: string[];
  from: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  text: string;
  html?: string;
}): HermesMailEnvelope {
  const own = new Set(
    input.ownAddresses
      .map(mailAddress)
      .filter((item): item is string => item !== null),
  );
  const from = mailAddress(input.from);
  if (!from || !own.has(from))
    throw new BadRequestException('MAIL_SENDER_NOT_VERIFIED');
  if (!['NEW', 'REPLY', 'REPLY_ALL', 'FORWARD'].includes(input.mode))
    throw new BadRequestException('MAIL_INVALID_ACTION');
  if (
    typeof input.text !== 'string' ||
    input.text.length > 10000 ||
    /\x00/.test(input.text)
  )
    throw new BadRequestException('MAIL_INVALID_TEXT');
  const dedup = new Set<string>();
  const clean = (items: string[]) =>
    items.flatMap((value) => {
      const address = mailAddress(value);
      if (!address) throw new BadRequestException('MAIL_INVALID_RECIPIENT');
      if (own.has(address) || dedup.has(address)) return [];
      dedup.add(address);
      return [address];
    });
  const preferred = mailAddresses(input.source.replyTo);
  const sourceFrom = mailAddresses(
    input.source.from ? [input.source.from] : [],
  );
  const reply = sourceFrom.every((address) => own.has(address))
    ? mailAddresses(input.source.to)
    : preferred.length
      ? preferred
      : sourceFrom;
  const to = clean(
    ['NEW', 'FORWARD'].includes(input.mode)
      ? (input.to ?? [])
      : [
          ...reply,
          ...(input.mode === 'REPLY_ALL' ? mailAddresses(input.source.to) : []),
        ],
  );
  const cc = clean(
    input.mode === 'REPLY_ALL'
      ? mailAddresses(input.source.cc)
      : ['NEW', 'FORWARD'].includes(input.mode)
        ? (input.cc ?? [])
        : [],
  );
  // Never inherit Bcc from received MIME, including when forwarding it.
  const bcc = clean(input.bcc ?? []);
  if (!to.length || dedup.size > 50)
    throw new BadRequestException('MAIL_INVALID_RECIPIENTS');
  const subject = mailHeader(input.source.subject ?? '');
  const messageId = mailMessageId(input.source.messageId);
  const references = [
    ...new Set(
      [
        ...(input.source.references?.match(/<[^<>\s]+>/g) ?? []),
        ...(messageId ? [messageId] : []),
      ]
        .map(mailMessageId)
        .filter((item): item is string => item !== null),
    ),
  ].slice(-30);
  return {
    from,
    to,
    cc,
    bcc,
    subject:
      (input.mode === 'NEW'
        ? ''
        : input.mode === 'FORWARD'
          ? /^fwd?:/i.test(subject)
            ? ''
            : 'Fwd: '
          : /^re:/i.test(subject)
            ? ''
            : 'Re: ') + subject,
    text:
      input.mode === 'FORWARD'
        ? (
            input.text +
            '\n\n--- Message transféré ---\nDe : ' +
            sourceFrom.join(', ') +
            '\nÀ : ' +
            mailAddresses(input.source.to).join(', ') +
            '\nObjet : ' +
            subject +
            '\n\n' +
            (input.source.text ??
              sanitizeHtml(input.source.html ?? '', {
                allowedTags: [],
                allowedAttributes: {},
              }))
          ).slice(0, 10000)
        : input.text,
    ...(input.html ? { html: sanitizeMailHtml(input.html) } : {}),
    ...(!['NEW', 'FORWARD'].includes(input.mode) && messageId
      ? { inReplyTo: messageId }
      : {}),
    references: ['NEW', 'FORWARD'].includes(input.mode) ? [] : references,
  };
}

export function mailThreadKey(source: Email, ownAddresses: string[]) {
  const own = new Set(ownAddresses.map(mailAddress));
  const participants = [
    ...new Set(
      [
        ...mailAddresses(source.from ? [source.from] : []),
        ...mailAddresses(source.to),
        ...mailAddresses(source.cc),
      ].filter((address) => !own.has(address)),
    ),
  ].sort();
  const root =
    (source.references?.match(/<[^<>\s]+>/g) ?? [])
      .map(mailMessageId)
      .find(Boolean) ??
    mailMessageId(source.inReplyTo) ??
    mailMessageId(source.messageId);
  if (!root) return null;
  return (
    'mail-thread:' +
    createHash('sha256')
      .update(JSON.stringify({ root, participants }))
      .digest('hex')
  );
}
