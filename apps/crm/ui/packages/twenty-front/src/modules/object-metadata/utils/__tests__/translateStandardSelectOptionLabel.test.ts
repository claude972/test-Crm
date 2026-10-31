import { i18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { STANDARD_OBJECT_FIELDS } from 'kovaa-lab-shared/metadata';

import { STANDARD_SELECT_OPTION_LABELS } from '@/object-metadata/constants/StandardSelectOptionLabels';
import { translateStandardSelectOptionLabel } from '@/object-metadata/utils/translateStandardSelectOptionLabel';
import { mockedStandardObjectMetadataQueryResult } from '~/testing/mock-data/generated/metadata/objects/mock-objects-metadata';

const STAGE_FIELD = STANDARD_OBJECT_FIELDS.opportunity.stage
  .universalIdentifier as string;
const SCREENING_ID = '20202020-e685-4671-ac32-26d304dacb6e';

const messageId = (source: string) =>
  generateMessageId(source, 'fieldMetadata.label');

// The front catalog does not carry these ids yet -- root owns the translations --
// so the French is loaded under the id Lingui will key them by. That makes the
// msgid itself part of the assertion.
const activateFrench = () => {
  i18n.load('fr-FR', {
    [messageId('New')]: 'Nouveau',
    [messageId('Screening')]: 'Présélection',
    [messageId('Proposal')]: 'Proposition',
  });
  i18n.activate('fr-FR');
};

const translate = (option: { id?: string | null; label: string }) =>
  translateStandardSelectOptionLabel({
    fieldUniversalIdentifier: STAGE_FIELD,
    option,
  });

describe('translateStandardSelectOptionLabel', () => {
  afterEach(() => {
    i18n.activate('en');
  });

  it('translates the shipped stage labels on a French locale', () => {
    activateFrench();

    expect(
      [
        { id: '20202020-8e01-4afd-9c39-d2063097587a', label: 'New' },
        { id: SCREENING_ID, label: 'Screening' },
        { id: '20202020-696e-4f6b-91bc-f413e9b2f654', label: 'Proposal' },
      ].map(translate),
    ).toEqual(['Nouveau', 'Présélection', 'Proposition']);
  });

  it('returns a renamed stage verbatim, in any locale', () => {
    activateFrench();

    expect(translate({ id: SCREENING_ID, label: 'Premier contact' })).toBe(
      'Premier contact',
    );
  });

  it('returns a stage renamed to another shipped wording verbatim', () => {
    activateFrench();

    // The echo test could not tell this from a translation; two facts can
    expect(translate({ id: SCREENING_ID, label: 'Customer' })).toBe('Customer');
  });

  it('reads the raw labels on an English locale', () => {
    i18n.activate('en');

    expect(translate({ id: SCREENING_ID, label: 'Screening' })).toBe(
      'Screening',
    );
  });

  it('leaves a custom field alone', () => {
    activateFrench();

    expect(
      translateStandardSelectOptionLabel({
        fieldUniversalIdentifier: 'f6a1c0de-0000-4000-8000-000000000001',
        option: { id: SCREENING_ID, label: 'Screening' },
      }),
    ).toBe('Screening');
  });

  it('leaves an operator-added option on a standard field alone', () => {
    activateFrench();

    expect(
      translate({ id: 'c0ffee00-0000-4000-8000-000000000002', label: 'New' }),
    ).toBe('New');
  });

  it('leaves an option with no id alone', () => {
    activateFrench();

    expect(translate({ label: 'Screening' })).toBe('Screening');
  });

  it('leaves an unidentified field alone', () => {
    activateFrench();

    expect(
      translateStandardSelectOptionLabel({
        fieldUniversalIdentifier: null,
        option: { id: SCREENING_ID, label: 'Screening' },
      }),
    ).toBe('Screening');
  });

  // Drift guard: the ids and English sources are the standard application's, so
  // they must keep matching the generated metadata rather than a hand copy.
  it('matches the generated standard metadata', () => {
    const stageField = mockedStandardObjectMetadataQueryResult.objects.edges
      .flatMap((objectEdge) => objectEdge.node.fieldsList)
      .find((field) => field.universalIdentifier === STAGE_FIELD);

    expect(stageField).toBeDefined();

    const shippedLabelByOptionId = new Map<string, string>(
      (stageField?.options ?? []).map(
        (option: { id: string; label: string }) => [option.id, option.label],
      ),
    );

    expect(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].map(
        ({ optionId, shippedLabel }) => [optionId, shippedLabel.message],
      ),
    ).toEqual(
      STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD].map(({ optionId }) => [
        optionId,
        shippedLabelByOptionId.get(optionId),
      ]),
    );

    expect(STANDARD_SELECT_OPTION_LABELS[STAGE_FIELD]).toHaveLength(
      shippedLabelByOptionId.size,
    );
  });
});
