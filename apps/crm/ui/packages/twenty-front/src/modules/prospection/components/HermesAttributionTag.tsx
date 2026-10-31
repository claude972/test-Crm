import { useLingui } from '@lingui/react/macro';
import {
  IconCircleOff,
  IconHelpCircle,
  IconPencil,
  IconShield,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesAttribution } from '@/prospection/types/HermesInboundClassification';

type HermesAttributionPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// Three attributions, three presentations. They are deliberately NOT collapsed
// into "attributed" versus "not attributed": an edited receipt is still
// correctly attributed to its connection, and saying so in the same breath as
// a verified one would hide the only fact an operator chasing a bad reception
// needs. See HermesInboundClassification.
const HERMES_ATTRIBUTION_PRESENTATION: Record<
  HermesAttribution,
  HermesAttributionPresentation
> = {
  verified: {
    color: 'green',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconShield,
  },
  // Amber, not red: the provenance holds. Only the evidence of the original
  // content is gone.
  'edited-receipt': {
    color: 'orange',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconPencil,
  },
  'not-attributable': {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
};

// A null attribution is an unknown one, shown dashed and said in words. It is
// never the verified case by default, and it is not 'not-attributable' either:
// the server not publishing a value is not the server stating one.
const UNKNOWN_ATTRIBUTION_PRESENTATION: HermesAttributionPresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type HermesAttributionTagProps = {
  attribution: HermesAttribution | null;
};

export const HermesAttributionTag = ({
  attribution,
}: HermesAttributionTagProps) => {
  const { t } = useLingui();

  const labels: Record<HermesAttribution, string> = {
    verified: t`Attribution verified`,
    'edited-receipt': t`Receipt edited`,
    'not-attributable': t`Not attributable`,
  };

  const meanings: Record<HermesAttribution, string> = {
    verified: t`The stored record is the one this connection and this event produce, and it still carries its receipt marker.`,
    'edited-receipt': t`The record was found under the same key, so the provenance holds, but its receipt marker is gone: it was edited.`,
    'not-attributable': t`No signed connection accounts for this reception. A manual or historical deposit is in this case, and it is not an automatic reception.`,
  };

  const presentation =
    attribution === null
      ? UNKNOWN_ATTRIBUTION_PRESENTATION
      : HERMES_ATTRIBUTION_PRESENTATION[attribution];

  return (
    // truncate={false}: "Not attributable" cut short would read as an
    // attribution the server never stated.
    <Tag
      color={presentation.color}
      variant={presentation.variant}
      borderStyle={presentation.borderStyle}
      startIcon={<presentation.Icon />}
      truncate={false}
      title={
        attribution === null
          ? t`The classification carries no attribution yet.`
          : meanings[attribution]
      }
    >
      {attribution === null ? t`Attribution not published` : labels[attribution]}
    </Tag>
  );
};
