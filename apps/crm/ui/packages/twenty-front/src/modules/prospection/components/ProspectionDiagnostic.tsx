import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledDetails = styled.details`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSummary = styled.summary`
  cursor: pointer;
  width: fit-content;

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledMessage = styled.p`
  margin: ${themeCssVariables.spacing[1]} 0 0;
  overflow-wrap: anywhere;
`;

type ProspectionDiagnosticProps = {
  // The server's own wording. Folded, because the headline above it already
  // says what happened in business terms.
  message: string | null;
};

export const ProspectionDiagnostic = ({
  message,
}: ProspectionDiagnosticProps) => {
  const { t } = useLingui();

  if (!isNonEmptyString(message)) {
    return null;
  }

  return (
    <StyledDetails>
      <StyledSummary>{t`Details`}</StyledSummary>
      <StyledMessage>{message}</StyledMessage>
    </StyledDetails>
  );
};
