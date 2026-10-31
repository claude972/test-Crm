import {
  convertEmailBodyToEmailDocument,
  type EmailDocumentStringContext,
  parseCanonicalEmailDocument,
  parseJson,
  transformEmailDocumentStrings,
} from 'kovaa-lab-shared/utils';

// What the field may hand the native editor for a stored bodyTemplate.
export type CampaignBodyDocumentRead =
  | { kind: 'empty' }
  | { kind: 'document'; serializedDocument: string }
  // A stored body no converter could read. Named rather than replaced by an
  // empty editor, which would read as a campaign carrying no message and
  // would overwrite the stored one on the next keystroke.
  | { kind: 'unreadable'; error: string };

const readCanonical = (value: unknown) => parseCanonicalEmailDocument(value);

export const readCampaignBodyDocument = (
  storedBody: string,
): CampaignBodyDocumentRead => {
  if (storedBody.trim() === '') {
    return { kind: 'empty' };
  }

  // A document the native editor already serialised travels back byte for
  // byte. Re-serialising it here is exactly how a round trip drops an
  // attribute this module does not know about.
  if (readCanonical(parseJson<unknown>(storedBody)).success) {
    return { kind: 'document', serializedDocument: storedBody };
  }

  // Not canonical: lifted by the converter the server's own migration and
  // mail sender use, never by a conversion written here.
  const conversion = convertEmailBodyToEmailDocument(storedBody);

  if (!conversion.success) {
    return { kind: 'unreadable', error: conversion.error };
  }

  const canonical = readCanonical(conversion.document);

  return canonical.success
    ? {
        kind: 'document',
        serializedDocument: JSON.stringify(canonical.document),
      }
    : { kind: 'unreadable', error: canonical.error };
};

// The strings a recipient ends up reading. 'url' is left out: a link target
// is not prose, so counting it would inflate the message length.
const CONTENT_STRING_CONTEXTS: readonly EmailDocumentStringContext[] = [
  'text',
  'html',
  'rawHtml',
];

// Only ever used to count characters and spot {{variables}}. The document
// itself is what gets persisted: this flattening never reaches bodyTemplate.
export const readCampaignBodyText = (storedBody: string): string => {
  const read = readCampaignBodyDocument(storedBody);

  if (read.kind !== 'document') {
    return '';
  }

  const parsed = readCanonical(parseJson<unknown>(read.serializedDocument));

  if (!parsed.success) {
    return '';
  }

  const collected: string[] = [];

  transformEmailDocumentStrings(parsed.document, (value, context) => {
    if (CONTENT_STRING_CONTEXTS.includes(context)) {
      collected.push(value);
    }

    return value;
  });

  return collected.join('\n');
};
