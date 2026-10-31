import { i18n } from '@lingui/core';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { FieldMetadataType } from 'kovaa-lab-shared/types';

import { formatFieldMetadataItemAsFieldDefinition } from '@/object-metadata/utils/formatFieldMetadataItemAsFieldDefinition';
import { type FieldSelectMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { getMockObjectMetadataItemOrThrow } from '~/testing/utils/getMockObjectMetadataItemOrThrow';

const opportunity = getMockObjectMetadataItemOrThrow('opportunity');

const stageField = opportunity.fields.find(
  (field) =>
    field.type === FieldMetadataType.SELECT && (field.options?.length ?? 0) > 0,
);

if (!stageField) {
  throw new Error('Missing the opportunity select field in the mock');
}

const activateFrench = () => {
  i18n.load('fr-FR', {
    [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
  });
  i18n.activate('fr-FR');
};

// The select variant of the metadata union is what declares options
const formatStageFieldOptions = (): FieldSelectMetadata['options'] => {
  const { metadata } = formatFieldMetadataItemAsFieldDefinition({
    field: stageField,
    objectMetadataItem: opportunity,
  });

  if (!('options' in metadata)) {
    throw new Error('Expected the select field definition to carry options');
  }

  return metadata.options;
};

describe('formatFieldMetadataItemAsFieldDefinition select options', () => {
  afterEach(() => {
    i18n.activate('en');
  });

  it('hands the renderer the translated wording', () => {
    activateFrench();

    expect(formatStageFieldOptions().map((option) => option.label)).toContain(
      'Présélection',
    );
  });

  it('keeps the api values on the field definition', () => {
    activateFrench();

    expect(formatStageFieldOptions().map((option) => option.value)).toEqual(
      (stageField.options ?? []).map((option) => option.value),
    );
  });

  // This is the invariant the whole display-only direction rests on: the array
  // the data-model form reads and sends back must never see a translation.
  it('leaves the canonical field metadata options untouched', () => {
    activateFrench();

    formatStageFieldOptions();

    expect((stageField.options ?? []).map((option) => option.label)).toContain(
      'Screening',
    );
    expect(
      (stageField.options ?? []).map((option) => option.label),
    ).not.toContain('Présélection');
  });

  it('shows the shipped wording on an English locale', () => {
    i18n.activate('en');

    expect(formatStageFieldOptions().map((option) => option.label)).toEqual(
      (stageField.options ?? []).map((option) => option.label),
    );
  });
});
