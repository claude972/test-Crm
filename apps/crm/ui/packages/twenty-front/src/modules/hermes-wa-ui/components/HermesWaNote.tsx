import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

// One short line under a control or a bubble. Callers pass role="alert" for a
// failure and role="status" for progress; the words carry the meaning, so an
// alert that differed only by colour would reach nobody who cannot see it.
export const HermesWaNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
`;

// The same line reporting a failure: colour on top of words that already say
// what happened, never instead of them.
export const HermesWaAlertNote = styled.p`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
`;

// A server-sourced code, verbatim. Never parsed, never translated.
export const HermesWaCode = styled.code`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
  padding: 0 ${themeCssVariables.spacing[1]};
`;
