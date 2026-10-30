import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

// One short line, never a paragraph. Error notes pass role="alert".
export const ProspectionNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;
