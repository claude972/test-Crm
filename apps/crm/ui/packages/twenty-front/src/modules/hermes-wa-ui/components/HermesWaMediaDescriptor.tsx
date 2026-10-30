import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaByteSizeLabel } from '@/hermes-wa-ui/components/HermesWaByteSizeLabel';
import { useHermesWaMediaKindLabel } from '@/hermes-wa-ui/hooks/useHermesWaMediaKindLabel';
import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';

const StyledLine = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: block;
  font-size: ${themeCssVariables.font.size.xs};
  min-width: 0;
  overflow-wrap: anywhere;
`;

type HermesWaMediaDescriptorProps = {
  media: HermesWaMedia;
};

// Kind, name and size in one line. This is what keeps an unavailable media
// readable: someone who cannot see the picture still knows a 2.4 MB image
// called plan.png was attached. Absent parts are dropped, not replaced by a
// dash; when nothing is known the line says so.
export const HermesWaMediaDescriptor = ({
  media,
}: HermesWaMediaDescriptorProps) => {
  const { t } = useLingui();

  const kindLabel = useHermesWaMediaKindLabel(media.kind);
  const name = media.name?.trim();
  const hasName = isNonEmptyString(name);
  const hasSize = media.byteSize !== null;

  if (kindLabel === null && !hasName && !hasSize) {
    return <StyledLine>{t`No details about this attachment.`}</StyledLine>;
  }

  return (
    <StyledLine>
      {kindLabel}
      {kindLabel !== null && (hasName || hasSize) ? ' · ' : null}
      {hasName ? name : null}
      {hasName && hasSize ? ' · ' : null}
      {hasSize ? <HermesWaByteSizeLabel byteSize={media.byteSize} /> : null}
    </StyledLine>
  );
};
