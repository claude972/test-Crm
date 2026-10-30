import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

// One short line, never a paragraph of marketing. Callers that carry an
// error pass role="alert" themselves.
export const HermesCampaignNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  max-width: 68ch;
`;
