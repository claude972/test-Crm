import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

// One short line, never a paragraph. A note that reports a failure passes
// role="alert"; a note that reports an outcome passes role="status".
export const HermesBotSettingsNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;
