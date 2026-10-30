import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconArrowDown,
  IconCheck,
  IconClock,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
} from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { type MessagingInboxMessageStatusRead } from '@/messaging-inbox/types/MessagingInboxMessageStatus';

const StyledGroup = styled.span`
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  text-transform: uppercase;
`;

type MessagingInboxMessageStatusProps = {
  status: MessagingInboxMessageStatusRead;
  errorCode: string | null;
};

// The delivery state, with exactly the meaning the contract gives it.
//
// The four published values are three distinct readings and are never
// aggregated:
//   RECEIVED    an authenticated inbound event;
//   ACCEPTED    a provider receipt or an outbound echo — the label says so in
//               words, because a tick mark alone would be read as delivered
//               and the contract forbids asserting delivery;
//   UNCONFIRMED the outcome is not known. It is not a failure, and it is never
//               resent automatically under the same clientRequestId;
//   FAILED      a refusal before transport, carried by one of three explicit
//               safe codes.
//
// A value outside the set is shown verbatim as unknown. Every tag carries its
// own icon and its own words, so none of these states depends on colour.
export const MessagingInboxMessageStatus = ({
  status,
  errorCode,
}: MessagingInboxMessageStatusProps) => {
  const { t } = useLingui();

  const presentation: {
    label: string;
    color: TagColor;
    icon: ReactNode;
    isDashed: boolean;
  } =
    status.kind === 'unknown'
      ? {
          label: isNonEmptyString(status.raw) ? status.raw : t`Not reported`,
          color: 'gray',
          icon: <IconHelpCircle />,
          isDashed: true,
        }
      : status.status === 'RECEIVED'
        ? {
            label: t`Received`,
            color: 'gray',
            icon: <IconArrowDown />,
            isDashed: false,
          }
        : status.status === 'ACCEPTED'
          ? {
              // Never "delivered": ACCEPTED is a receipt from the provider.
              label: t`Accepted, delivery unknown`,
              color: 'blue',
              icon: <IconCheck />,
              isDashed: false,
            }
          : status.status === 'UNCONFIRMED'
            ? {
                label: t`Unconfirmed`,
                color: 'orange',
                icon: <IconClock />,
                isDashed: false,
              }
            : {
                label: t`Failed`,
                color: 'red',
                icon: <IconAlertTriangle />,
                isDashed: false,
              };

  return (
    <StyledGroup>
      <StyledLabel>{t`Status`}</StyledLabel>
      <Tag
        color={presentation.color}
        variant={presentation.isDashed ? 'outline' : 'soft'}
        borderStyle={presentation.isDashed ? 'dashed' : 'solid'}
        truncate={false}
        startIcon={presentation.icon}
      >
        {presentation.label}
      </Tag>

      {/* The server's own code, verbatim. Its presence is the fact; it is
          never parsed into a delivery outcome. */}
      {isNonEmptyString(errorCode) && (
        <>
          <StyledLabel>{t`Code`}</StyledLabel>
          <Tag
            color="red"
            variant="outline"
            truncate={false}
            startIcon={<IconAlertTriangle />}
          >
            {errorCode}
          </Tag>
        </>
      )}
    </StyledGroup>
  );
};
