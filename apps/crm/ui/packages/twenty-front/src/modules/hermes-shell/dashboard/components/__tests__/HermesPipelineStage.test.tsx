import { i18n } from '@lingui/core';
import { render } from '@testing-library/react';
import { generateMessageId } from 'kovaa-lab-shared/i18n';
import { STANDARD_OBJECT_FIELDS } from 'kovaa-lab-shared/metadata';

import { HermesPipelineStage } from '@/hermes-shell/dashboard/components/HermesPipelineStage';

const useHermesRecordCountMock = jest.fn();

jest.mock('@/hermes-shell/dashboard/hooks/useHermesRecordCount', () => ({
  useHermesRecordCount: (params: unknown) => {
    useHermesRecordCountMock(params);

    return { value: 0, isLoading: false, hasError: false };
  },
}));

jest.mock('@/hermes-shell/dashboard/components/HermesMetricValue', () => ({
  HermesMetricValue: () => null,
}));

const STAGE_FIELD = STANDARD_OBJECT_FIELDS.opportunity.stage
  .universalIdentifier as string;

const screeningOption = {
  id: '20202020-e685-4671-ac32-26d304dacb6e',
  value: 'SCREENING',
  label: 'Screening',
  position: 1,
  color: 'purple' as const,
};

const renderStage = (option: typeof screeningOption) =>
  render(
    <HermesPipelineStage
      objectMetadataId="20202020-9549-49dd-b2b2-883999db8938"
      objectNameSingular="opportunity"
      stageFieldName="stage"
      stageFieldUniversalIdentifier={STAGE_FIELD}
      option={option}
    />,
  );

describe('HermesPipelineStage', () => {
  beforeEach(() => {
    useHermesRecordCountMock.mockClear();
  });

  afterEach(() => {
    i18n.activate('en');
  });

  it('shows the shipped wording on an English locale', () => {
    i18n.activate('en');

    expect(renderStage(screeningOption).getByText('Screening')).toBeDefined();
  });

  it('shows the translated wording while counting on the canonical api value', () => {
    i18n.load('fr-FR', {
      [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
    });
    i18n.activate('fr-FR');

    const { getByText, queryByText } = renderStage(screeningOption);

    expect(getByText('Présélection')).toBeDefined();
    expect(queryByText('Screening')).toBeNull();

    // the metric is still asked for the stored value, not the rendered one
    expect(useHermesRecordCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { stage: { eq: 'SCREENING' } },
      }),
    );
  });

  it('keeps a renamed stage verbatim', () => {
    i18n.load('fr-FR', {
      [generateMessageId('Screening', 'fieldMetadata.label')]: 'Présélection',
    });
    i18n.activate('fr-FR');

    const { getByText } = renderStage({
      ...screeningOption,
      label: 'Premier contact',
    });

    expect(getByText('Premier contact')).toBeDefined();
  });
});
