import { useLingui } from '@lingui/react/macro';
import {
  IconFileUpload,
  IconHelpCircle,
  IconWebhook,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesCollectionOrigin } from '@/prospection/types/HermesCollectionOrigin';

type HermesCollectionOriginPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

const HERMES_COLLECTION_ORIGIN_PRESENTATION: Record<
  HermesCollectionOrigin,
  HermesCollectionOriginPresentation
> = {
  automatic: {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconWebhook,
  },
  'manual-json': {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconFileUpload,
  },
};

// A null origin is an unknown one, shown dashed and said in words. It is not
// the manual deposit by default: see HermesCollectionOrigin.
const UNKNOWN_ORIGIN_PRESENTATION: HermesCollectionOriginPresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type HermesCollectionOriginTagProps = {
  origin: HermesCollectionOrigin | null;
};

export const HermesCollectionOriginTag = ({
  origin,
}: HermesCollectionOriginTagProps) => {
  const { t } = useLingui();

  const labels: Record<HermesCollectionOrigin, string> = {
    automatic: t`Automatic`,
    'manual-json': t`Manual JSON`,
  };

  const meanings: Record<HermesCollectionOrigin, string> = {
    automatic: t`Received through the authenticated entry point.`,
    'manual-json': t`Deposited by hand on this screen.`,
  };

  const presentation =
    origin === null
      ? UNKNOWN_ORIGIN_PRESENTATION
      : HERMES_COLLECTION_ORIGIN_PRESENTATION[origin];

  return (
    // truncate={false}: "Manual JSON" cut short would read as an origin the
    // server never stated.
    <Tag
      color={presentation.color}
      variant={presentation.variant}
      borderStyle={presentation.borderStyle}
      startIcon={<presentation.Icon />}
      truncate={false}
      title={
        origin === null
          ? t`The collection contract carries no origin yet.`
          : meanings[origin]
      }
    >
      {origin === null ? t`Origin not published` : labels[origin]}
    </Tag>
  );
};
