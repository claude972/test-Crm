import { i18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { FieldMetadataType } from 'kovaa-lab-shared/types';

import { type ViewGroup } from '@/views/types/ViewGroup';
import { mapViewGroupsToRecordGroupDefinitions } from '@/views/utils/mapViewGroupsToRecordGroupDefinitions';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

const opportunity = getMockObjectMetadataItemOrThrow('opportunity');

const stageField = opportunity.fields.find(
  (field) =>
    field.type === FieldMetadataType.SELECT && (field.options?.length ?? 0) > 0,
);

if (!stageField) {
  throw new Error('Missing the opportunity select field in the mock');
}

const buildViewGroup = (fieldValue: string, position: number): ViewGroup => ({
  id: `view-group-${fieldValue}`,
  fieldValue,
  isVisible: true,
  position,
});

const mapDefinitions = () =>
  mapViewGroupsToRecordGroupDefinitions({
    mainGroupByFieldMetadataId: stageField.id,
    objectMetadataItem: opportunity,
    viewGroups: (stageField.options ?? []).map((option, index) =>
      buildViewGroup(option.value, index),
    ),
  });

describe('mapViewGroupsToRecordGroupDefinitions', () => {
  afterEach(() => {
    i18n.activate('en');
  });

  it('shows the shipped wording on an English locale', () => {
    i18n.activate('en');

    expect(mapDefinitions().map((definition) => definition.title)).toEqual(
      (stageField.options ?? []).map((option) => option.label),
    );
  });

  it('translates the board column titles while keeping the api values', () => {
    i18n.load('fr-FR', {
      [generateMessageId('New', 'fieldMetadata.label')]: 'Nouveau',
      [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
      [generateMessageId('Proposal', 'fieldMetadata.label')]: 'Proposition',
    });
    i18n.activate('fr-FR');

    const definitions = mapDefinitions();
    const titleByValue = new Map(
      definitions.map((definition) => [definition.value, definition.title]),
    );

    expect(titleByValue.get('NEW')).toBe('Nouveau');
    expect(titleByValue.get('SCREENING')).toBe('Présélection');
    expect(titleByValue.get('PROPOSAL')).toBe('Proposition');

    // the column identity a card move is written against is untouched
    expect(definitions.map((definition) => definition.value)).toEqual(
      (stageField.options ?? []).map((option) => option.value),
    );
  });

  it('never mutates the canonical options the data-model form reads', () => {
    i18n.load('fr-FR', {
      [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
    });
    i18n.activate('fr-FR');

    mapDefinitions();

    expect((stageField.options ?? []).map((option) => option.label)).toContain(
      'Screening',
    );
  });
});
