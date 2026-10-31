import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Fragment } from 'react';

import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconChevronRight } from 'kovaa-lab-ui/icon';
import {
  MOBILE_VIEWPORT,
  themeCssVariables,
  useTheme,
} from 'kovaa-lab-ui/theme';

import { HermesNote } from '@/hermes-shell/dashboard/components/HermesNote';
import { HermesPipelineStage } from '@/hermes-shell/dashboard/components/HermesPipelineStage';
import {
  HERMES_PIPELINE_OBJECT_NAME_SINGULAR,
  HERMES_PIPELINE_STAGE_FIELD_NAME,
} from '@/hermes-shell/dashboard/constants/HermesPipelineFieldNames';
import { isMinimalMetadataReadyState } from '@/metadata-store/states/isMinimalMetadataReadyState';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
// The generated enum, not the twenty-shared copy: FieldMetadataItem.type is
// declared with this one and the two do not compare.
import { FieldMetadataType } from '~/generated-metadata/graphql';

const StyledTrack = styled.div`
  align-items: stretch;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  overflow-x: auto;
  padding-bottom: ${themeCssVariables.spacing[1]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    flex-direction: column;
    overflow-x: visible;
  }
`;

const StyledStageSlot = styled.div`
  display: flex;
  flex: 1 1 0;
  min-width: 0;
`;

const StyledArrow = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex: 0 0 auto;

  /* Stacked on narrow viewports the arrow would point the wrong way, so it is
     dropped rather than rotated into a second meaning. */
  @media (max-width: ${MOBILE_VIEWPORT}px) {
    display: none;
  }
`;

export const HermesPipelineSection = () => {
  const { t } = useLingui();
  const theme = useTheme();
  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  const opportunityObjectMetadataItem = objectMetadataItems.find(
    (candidate) =>
      candidate.nameSingular === HERMES_PIPELINE_OBJECT_NAME_SINGULAR &&
      candidate.isActive,
  );

  // Metadata not in yet is not the same as no pipeline configured.
  if (!isMinimalMetadataReady) {
    return (
      <Section.Root>
        <Section.Header title={t`Pipeline`} />
        <HermesNote>
          <Trans>Loading…</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  if (!isDefined(opportunityObjectMetadataItem)) {
    return (
      <Section.Root>
        <Section.Header title={t`Pipeline`} />
        <HermesNote>
          <Trans>To configure.</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  const canReadOpportunities = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    opportunityObjectMetadataItem.id,
  ).canReadObjectRecords;

  if (!canReadOpportunities) {
    return (
      <Section.Root>
        <Section.Header title={t`Pipeline`} />
        <HermesNote>
          <Trans>Not authorised.</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  // readableFields, not fields: a stage field this role cannot read must not
  // become a row that then counts nothing.
  const stageFieldMetadataItem =
    opportunityObjectMetadataItem.readableFields.find(
      (field) =>
        field.name === HERMES_PIPELINE_STAGE_FIELD_NAME &&
        field.type === FieldMetadataType.SELECT,
    );

  const stageOptions = [...(stageFieldMetadataItem?.options ?? [])].sort(
    (firstOption, secondOption) => firstOption.position - secondOption.position,
  );

  if (!isDefined(stageFieldMetadataItem) || stageOptions.length === 0) {
    return (
      <Section.Root>
        <Section.Header title={t`Pipeline`} />
        <HermesNote>
          <Trans>To configure.</Trans>
        </HermesNote>
      </Section.Root>
    );
  }

  return (
    <Section.Root>
      <Section.Header
        title={t`Pipeline`}
        description={opportunityObjectMetadataItem.labelPlural}
      />
      <StyledTrack>
        {stageOptions.map((option, optionIndex) => (
          <Fragment key={option.id}>
            <StyledStageSlot>
              <HermesPipelineStage
                objectMetadataId={opportunityObjectMetadataItem.id}
                objectNameSingular={opportunityObjectMetadataItem.nameSingular}
                stageFieldName={stageFieldMetadataItem.name}
                stageFieldUniversalIdentifier={
                  stageFieldMetadataItem.universalIdentifier
                }
                option={option}
              />
            </StyledStageSlot>
            {optionIndex < stageOptions.length - 1 && (
              <StyledArrow>
                <IconChevronRight size={theme.icon.size.md} aria-hidden />
              </StyledArrow>
            )}
          </Fragment>
        ))}
      </StyledTrack>
    </Section.Root>
  );
};
