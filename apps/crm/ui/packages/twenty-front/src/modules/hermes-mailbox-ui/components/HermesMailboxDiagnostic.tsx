import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledDiagnostic = styled.code`
  color: ${themeCssVariables.font.color.tertiary};
  display: block;
  font-family: ${themeCssVariables.code.font.family};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

type HermesMailboxDiagnosticProps = {
  message: string | null;
};

// A server-sourced message, verbatim and untranslated.
//
// It is here so a failure can be reported to whoever can fix it, not so the
// interface can interpret it. Nothing in this module branches on its text.
export const HermesMailboxDiagnostic = ({
  message,
}: HermesMailboxDiagnosticProps) => {
  if (!isNonEmptyString(message)) {
    return null;
  }

  return <StyledDiagnostic>{message}</StyledDiagnostic>;
};
