import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  IconAlertTriangle,
  IconCircleOff,
  IconEyeOff,
  IconHelpCircle,
  IconMailX,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { type ProspectionSuppressionEntry } from '@/prospection/types/ProspectionSuppressionEntry';
import { MessageSuppressionReason } from '~/generated-metadata/graphql';

const StyledEntries = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledUnknown = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type SuppressionPresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// One icon and one word per reason, so no two entries read alike without
// colour. Tracking deliberately looks like what it is — a refused measurement,
// not a refused contact.
const SUPPRESSION_PRESENTATION: Record<
  MessageSuppressionReason,
  SuppressionPresentation
> = {
  [MessageSuppressionReason.UNSUBSCRIBE]: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCircleOff,
  },
  [MessageSuppressionReason.BOUNCE]: {
    color: 'orange',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconMailX,
  },
  [MessageSuppressionReason.COMPLAINT]: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconAlertTriangle,
  },
  [MessageSuppressionReason.TRACKING]: {
    color: 'gray',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconEyeOff,
  },
};

const UNKNOWN_PRESENTATION: SuppressionPresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type ProspectionSuppressionCellProps = {
  entries: ProspectionSuppressionEntry[];
  // False while the register is only partly read: an address with no entry is
  // then unknown, never clear.
  isAbsenceKnown: boolean;
};

// Shows the register's entries as they are. It states no verdict on whether a
// message may be sent: that depends on the reason and on the topic scope, and
// the server owns the rule. Nothing here lifts an entry.
export const ProspectionSuppressionCell = ({
  entries,
  isAbsenceKnown,
}: ProspectionSuppressionCellProps) => {
  const { t } = useLingui();

  if (entries.length === 0) {
    return isAbsenceKnown ? (
      <StyledUnknown>{t`No entry`}</StyledUnknown>
    ) : (
      <Tag color="gray" variant="outline" borderStyle="dashed" truncate={false}>
        {t`Unknown`}
      </Tag>
    );
  }

  // The scope comes from the entry itself: no topic means every topic, a topic
  // id means that one only.
  const describe = (entry: ProspectionSuppressionEntry): string => {
    switch (entry.reason) {
      case MessageSuppressionReason.UNSUBSCRIBE:
        return isDefined(entry.unsubscribeTopicId)
          ? t`Unsubscribed from one topic`
          : t`Unsubscribed from every topic`;
      case MessageSuppressionReason.BOUNCE:
        return t`Bounced`;
      case MessageSuppressionReason.COMPLAINT:
        return t`Complaint`;
      case MessageSuppressionReason.TRACKING:
        return t`Tracking refused`;
      default:
        return t`Unknown entry`;
    }
  };

  const explain = (entry: ProspectionSuppressionEntry): string => {
    switch (entry.reason) {
      case MessageSuppressionReason.UNSUBSCRIBE:
        return isDefined(entry.unsubscribeTopicId)
          ? t`Limited to one topic.`
          : t`Every topic.`;
      case MessageSuppressionReason.TRACKING:
        return t`Opens and clicks only. Not a refusal to be contacted.`;
      default:
        return t`Delivery entry.`;
    }
  };

  return (
    <StyledEntries>
      {entries.map((entry) => {
        const presentation =
          SUPPRESSION_PRESENTATION[entry.reason] ?? UNKNOWN_PRESENTATION;

        return (
          <Tag
            key={entry.id}
            color={presentation.color}
            variant={presentation.variant}
            borderStyle={presentation.borderStyle}
            startIcon={<presentation.Icon />}
            truncate={false}
            title={explain(entry)}
          >
            {describe(entry)}
          </Tag>
        );
      })}
    </StyledEntries>
  );
};
