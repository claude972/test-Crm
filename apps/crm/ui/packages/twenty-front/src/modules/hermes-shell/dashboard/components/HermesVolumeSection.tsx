import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';

import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMetricCard } from '@/hermes-shell/dashboard/components/HermesMetricCard';
import { HermesObjectCountCard } from '@/hermes-shell/dashboard/components/HermesObjectCountCard';
import { type HermesMetric } from '@/hermes-shell/dashboard/types/HermesMetric';
import { isMinimalMetadataReadyState } from '@/metadata-store/states/isMinimalMetadataReadyState';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: 1fr;
  }
`;

const NOT_CONFIGURED_METRIC: HermesMetric = {
  status: 'notConfigured',
  value: null,
};

const LOADING_METRIC: HermesMetric = { status: 'loading', value: null };

export const HermesVolumeSection = () => {
  const { t } = useLingui();
  const isMinimalMetadataReady = useAtomStateValue(isMinimalMetadataReadyState);
  const { objectMetadataItems } = useObjectMetadataItems();

  // Fallback labels only apply when the object is absent from this workspace,
  // and the card then says "To configure" instead of a count.
  const trackedObjects = [
    { nameSingular: 'company', fallbackLabel: t`Companies` },
    { nameSingular: 'person', fallbackLabel: t`People` },
    { nameSingular: 'opportunity', fallbackLabel: t`Opportunities` },
    { nameSingular: 'task', fallbackLabel: t`Tasks` },
  ];

  return (
    <Section.Root>
      <Section.Header title={t`Volume`} />
      <StyledGrid>
        {trackedObjects.map((trackedObject) => {
          const objectMetadataItem = objectMetadataItems.find(
            (candidate) =>
              candidate.nameSingular === trackedObject.nameSingular &&
              candidate.isActive,
          );

          return isDefined(objectMetadataItem) ? (
            <HermesObjectCountCard
              key={trackedObject.nameSingular}
              objectMetadataItem={objectMetadataItem}
            />
          ) : (
            <HermesMetricCard
              key={trackedObject.nameSingular}
              label={trackedObject.fallbackLabel}
              // An object missing because the metadata has not arrived is
              // still loading, not missing from the workspace.
              metric={
                isMinimalMetadataReady
                  ? NOT_CONFIGURED_METRIC
                  : LOADING_METRIC
              }
            />
          );
        })}
      </StyledGrid>
    </Section.Root>
  );
};
