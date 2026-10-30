import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxParticipants } from '@/hermes-mailbox-ui/types/HermesMailboxThread';
import { formatHermesMailboxAddress } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

const StyledHeaders = styled.dl`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[0.5]} ${themeCssVariables.spacing[2]};
  grid-template-columns: auto minmax(0, 1fr);
  margin: 0;
  min-width: 0;
  padding-bottom: ${themeCssVariables.spacing[3]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledTerm = styled.dt`
  color: ${themeCssVariables.font.color.tertiary};
  font-weight: ${themeCssVariables.font.weight.medium};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    margin-top: ${themeCssVariables.spacing[1]};
  }
`;

const StyledValue = styled.dd`
  color: ${themeCssVariables.font.color.secondary};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

type HermesMailboxHeadersProps = {
  participants: HermesMailboxParticipants;
};

// The From, Reply-To, To, Cc and Bcc headers of a thread.
//
// Bcc appears only when the server disclosed it, which it does for the
// mailbox's owner alone. Otherwise the row says so: "not exposed" and "empty"
// are different facts, and only one of them is reassuring.
export const HermesMailboxHeaders = ({
  participants,
}: HermesMailboxHeadersProps) => {
  const { t } = useLingui();

  const describeList = (addresses: HermesMailboxAddress[]): string =>
    addresses.length === 0
      ? t`No address given`
      : addresses.map(formatHermesMailboxAddress).join(', ');

  const describeBcc = (): string => {
    const { bcc } = participants;

    if (bcc.kind === 'disclosed') {
      return bcc.addresses.length === 0
        ? t`None on this thread`
        : describeList(bcc.addresses);
    }

    if (bcc.kind === 'ownerOnly') {
      return t`Visible to the mailbox owner only`;
    }

    return t`Not reported by the server`;
  };

  return (
    <StyledHeaders>
      <StyledTerm>{t`From`}</StyledTerm>
      {/* Provider-sourced. Rendered as text throughout. */}
      <StyledValue>
        {participants.from === null
          ? t`No sender given`
          : formatHermesMailboxAddress(participants.from)}
      </StyledValue>

      {/* The address an answer will actually go to, when the message named
          one. The preference itself is applied by the server. */}
      {participants.replyTo !== null && (
        <>
          <StyledTerm>{t`Reply-To`}</StyledTerm>
          <StyledValue>
            {formatHermesMailboxAddress(participants.replyTo)}
          </StyledValue>
        </>
      )}

      <StyledTerm>{t`To`}</StyledTerm>
      <StyledValue>{describeList(participants.to)}</StyledValue>

      <StyledTerm>{t`Cc`}</StyledTerm>
      <StyledValue>{describeList(participants.cc)}</StyledValue>

      <StyledTerm>{t`Bcc`}</StyledTerm>
      <StyledValue>{describeBcc()}</StyledValue>
    </StyledHeaders>
  );
};
