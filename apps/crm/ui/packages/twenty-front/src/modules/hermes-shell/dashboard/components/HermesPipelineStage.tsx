import { styled } from '@linaria/react';
import { useMemo } from 'react';

import { type RecordGqlOperationFilter } from 'kovaa-lab-shared/types';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMetricValue } from '@/hermes-shell/dashboard/components/HermesMetricValue';
import { useHermesRecordCount } from '@/hermes-shell/dashboard/hooks/useHermesRecordCount';
import { type FieldMetadataItemOption } from '@/object-metadata/types/FieldMetadataItem';

const StyledStage = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

type HermesPipelineStageProps = {
  objectMetadataId: string;
  objectNameSingular: string;
  stageFieldName: string;
  option: FieldMetadataItemOption;
};

export const HermesPipelineStage = ({
  objectMetadataId,
  objectNameSingular,
  stageFieldName,
  option,
}: HermesPipelineStageProps) => {
  const filter = useMemo<RecordGqlOperationFilter>(
    () => ({ [stageFieldName]: { eq: option.value } }),
    [stageFieldName, option.value],
  );

  const metric = useHermesRecordCount({
    objectMetadataId,
    objectNameSingular,
    filter,
  });

  return (
    <StyledStage>
      {/* The stage name is inside the tag, so the stage is identified by its
          own words and not by the colour the workspace chose for it. */}
      <Tag
        color={option.color}
        variant="soft"
        weight="medium"
        truncate={false}
      >
        {option.label}
      </Tag>
      <HermesMetricValue metric={metric} />
    </StyledStage>
  );
};
