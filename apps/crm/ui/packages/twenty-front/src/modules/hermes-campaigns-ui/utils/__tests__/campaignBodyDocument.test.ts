import {
  parseCanonicalEmailDocument,
  parseJson,
} from 'kovaa-lab-shared/utils';

import {
  readCampaignBodyDocument,
  readCampaignBodyText,
} from '@/hermes-campaigns-ui/utils/campaignBodyDocument';

const buildCanonicalDocument = (text: string) =>
  JSON.stringify({
    type: 'doc',
    attrs: { schemaVersion: 1 },
    content: [
      { type: 'paragraph', content: [{ type: 'text', text }] },
    ],
  });

const expectCanonical = (serializedDocument: string) =>
  expect(
    parseCanonicalEmailDocument(parseJson<unknown>(serializedDocument)),
  ).toEqual(expect.objectContaining({ success: true }));

describe('readCampaignBodyDocument', () => {
  it('reports an empty stored body as empty', () => {
    expect(readCampaignBodyDocument('')).toEqual({ kind: 'empty' });
    expect(readCampaignBodyDocument('   ')).toEqual({ kind: 'empty' });
  });

  it('hands a canonical document back byte for byte', () => {
    const storedDocument = JSON.stringify({
      type: 'doc',
      attrs: { schemaVersion: 1, canvasTheme: { width: '600px' } },
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'right' },
          content: [
            { type: 'text', text: 'Bonjour', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    });

    const read = readCampaignBodyDocument(storedDocument);

    expect(read).toEqual({
      kind: 'document',
      serializedDocument: storedDocument,
    });
  });

  it('lifts a legacy plain-text body into a canonical document', () => {
    const read = readCampaignBodyDocument('Bonjour\nà bientôt');

    expect(read.kind).toBe('document');

    if (read.kind !== 'document') {
      return;
    }

    expectCanonical(read.serializedDocument);
    expect(readCampaignBodyText(read.serializedDocument)).toContain('Bonjour');
  });

  it('lifts a legacy body carrying a variable without losing it', () => {
    const read = readCampaignBodyDocument('Bonjour {{firstName}}');

    expect(read.kind).toBe('document');

    if (read.kind !== 'document') {
      return;
    }

    expectCanonical(read.serializedDocument);
    expect(readCampaignBodyText(read.serializedDocument)).toContain(
      '{{firstName}}',
    );
  });
});

describe('readCampaignBodyText', () => {
  it('reads the prose of a document, not its serialised envelope', () => {
    expect(readCampaignBodyText(buildCanonicalDocument('Bonjour'))).toBe(
      'Bonjour',
    );
  });

  it('reads an empty document as empty so a missing message is reported', () => {
    const emptyDocument = JSON.stringify({
      type: 'doc',
      attrs: { schemaVersion: 1 },
      content: [{ type: 'paragraph' }],
    });

    expect(readCampaignBodyText(emptyDocument).trim()).toBe('');
  });

  it('keeps a variable readable so an undeclared one is still reported', () => {
    expect(
      readCampaignBodyText(buildCanonicalDocument('Bonjour {{firstName}}')),
    ).toContain('{{firstName}}');
  });
});
