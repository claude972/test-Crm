import { useLingui } from '@lingui/react/macro';
import {
  IconCheck,
  IconClock,
  IconHelpCircle,
  IconQuestionMark,
  IconX,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';

import { type ClientBookingAttendeeResponse } from '@/client-context/types/ClientBooking';

type AttendeePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// One icon and one word per answer, so none of the four reads like another
// without colour. 'needs-action' and 'tentative' are the two that are not an
// answer yet, so they are the dashed outlines — and a dashed border only
// paints under variant="outline".
const ATTENDEE_RESPONSE_PRESENTATION: Record<
  ClientBookingAttendeeResponse,
  AttendeePresentation
> = {
  accepted: {
    color: 'jade',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconCheck,
  },
  declined: {
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
    Icon: IconX,
  },
  'needs-action': {
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconClock,
  },
  tentative: {
    color: 'amber',
    variant: 'outline',
    borderStyle: 'dashed',
    Icon: IconQuestionMark,
  },
};

const UNKNOWN_RESPONSE_PRESENTATION: AttendeePresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type ClientBookingAttendeeTagProps = {
  // Null for an answer outside the four the native participant object defines.
  response: ClientBookingAttendeeResponse | null;
};

// The ATTENDEE's answer, which is a fact from the calendar provider. It is
// shown separately from the item's sync status and never substituted for it: an
// attendee accepting an invitation is not a confirmation that this workspace
// holds the item.
export const ClientBookingAttendeeTag = ({
  response,
}: ClientBookingAttendeeTagProps) => {
  const { t } = useLingui();

  const labels: Record<ClientBookingAttendeeResponse, string> = {
    accepted: t`Accepted`,
    declined: t`Declined`,
    'needs-action': t`No answer yet`,
    tentative: t`Tentative`,
  };

  const presentation =
    response === null
      ? UNKNOWN_RESPONSE_PRESENTATION
      : ATTENDEE_RESPONSE_PRESENTATION[response];

  return (
    // truncate={false}: a cut answer would read as another answer.
    <Tag
      color={presentation.color}
      variant={presentation.variant}
      borderStyle={presentation.borderStyle}
      startIcon={<presentation.Icon />}
      truncate={false}
    >
      {response === null ? t`Answer unknown` : labels[response]}
    </Tag>
  );
};
