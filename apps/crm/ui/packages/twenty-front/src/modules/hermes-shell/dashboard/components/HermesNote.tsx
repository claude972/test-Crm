import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

type HermesNoteProps = {
  children: ReactNode;
  // Set on a failure so the message reaches a screen reader when it replaces
  // data that was expected to arrive.
  isAlert?: boolean;
};

export const HermesNote = ({ children, isAlert = false }: HermesNoteProps) => (
  <StyledNote role={isAlert ? 'alert' : undefined}>{children}</StyledNote>
);
