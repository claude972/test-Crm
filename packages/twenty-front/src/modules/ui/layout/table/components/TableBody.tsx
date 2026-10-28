import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledTableBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

export { StyledTableBody as TableBody };
