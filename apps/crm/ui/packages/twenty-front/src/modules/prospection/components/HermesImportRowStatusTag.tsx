import { useLingui } from '@lingui/react/macro';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconClock,
  IconCopy,
  IconHelpCircle,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type HermesImportRowStatus } from '@/prospection/types/HermesImportRowStatus';

type HermesImportRowStatusPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// One icon and one word per status, so none of the six reads like another
// without colour. A dashed border only paints under variant="outline", which
// is why the two uncertain cases use that variant.
const HERMES_IMPORT_ROW_STATUS_PRESENTATION: Record<
  HermesImportRowStatus,
  HermesImportRowStatusPresentation
> = {
  pending: {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'solid',
    Icon: IconClock,
  },
  invalid: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconAlertTriangle,
  },
  duplicate: {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCopy,
  },
  suppressed: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
  qualified: {
    color: 'jade',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCheck,
  },
  conflict: {
    color: 'amber',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconAlertCircle,
  },
};

const UNKNOWN_STATUS_PRESENTATION: HermesImportRowStatusPresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type HermesImportRowStatusTagProps = {
  // Null for a status that is not one of the six in the contract.
  status: HermesImportRowStatus | null;
};

export const HermesImportRowStatusTag = ({
  status,
}: HermesImportRowStatusTagProps) => {
  const { t } = useLingui();

  const labels: Record<HermesImportRowStatus, string> = {
    pending: t`Pending`,
    invalid: t`Invalid`,
    duplicate: t`Duplicate`,
    suppressed: t`Suppressed`,
    qualified: t`Qualified`,
    conflict: t`Conflict`,
  };

  // What each status means for the person reading the row, in one line.
  const meanings: Record<HermesImportRowStatus, string> = {
    pending: t`Staged, not qualified yet.`,
    invalid: t`Email, company or website rejected. The row is kept with its error.`,
    duplicate: t`Already present in this batch.`,
    suppressed: t`Blocked by the workspace suppression register. Never lifted here.`,
    qualified: t`Company and contact created or reused.`,
    conflict: t`Same batch id, different content.`,
  };

  const { color, variant, borderStyle, Icon } =
    status === null
      ? UNKNOWN_STATUS_PRESENTATION
      : HERMES_IMPORT_ROW_STATUS_PRESENTATION[status];

  return (
    // truncate={false}: a cut status word would read as another status.
    <Tag
      color={color}
      variant={variant}
      borderStyle={borderStyle}
      startIcon={<Icon />}
      truncate={false}
      title={status === null ? t`Status outside the contract.` : meanings[status]}
    >
      {status === null ? t`Unknown status` : labels[status]}
    </Tag>
  );
};
