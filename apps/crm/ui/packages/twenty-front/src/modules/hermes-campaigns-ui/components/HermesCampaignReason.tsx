import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledReason = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledSentence = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledCode = styled.code`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

type HermesCampaignReasonProps = {
  // The server's code, when it published one.
  reasonCode: string | null;
  // The server's sentence, when it published one.
  reason: string | null;
  // What to say when the server published neither. Never left blank: a
  // refusal with no reason still owes the reader an explanation of what the
  // interface does know.
  fallback: string;
  // Set so a control can point at this text with aria-describedby. A disabled
  // control is not reachable by keyboard, so the reason has to live in the
  // page rather than in a tooltip.
  id?: string;
};

export const HermesCampaignReason = ({
  reasonCode,
  reason,
  fallback,
  id,
}: HermesCampaignReasonProps) => {
  const { t } = useLingui();

  const trimmedReason = isDefined(reason) ? reason.trim() : null;
  const trimmedCode = isDefined(reasonCode) ? reasonCode.trim() : null;

  return (
    <StyledReason id={id}>
      <StyledSentence>
        {isNonEmptyString(trimmedReason) ? trimmedReason : fallback}
      </StyledSentence>
      {isNonEmptyString(trimmedCode) && (
        // The code is shown next to the sentence, not instead of it: a code
        // alone is not an explanation, and a sentence alone cannot be looked
        // up in a log.
        <StyledCode aria-label={t`Reason code`}>{trimmedCode}</StyledCode>
      )}
    </StyledReason>
  );
};
