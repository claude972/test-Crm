import { styled } from '@linaria/react';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

// One short line of explanation or outcome, never a paragraph of marketing.
//
// A note that reports a failure passes role="alert"; a note that reports an
// outcome or a progress passes role="status". Both are read out, which is why
// a state is never carried by colour alone anywhere in this module.
export const HermesAdminNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  margin: 0;
  overflow-wrap: anywhere;
`;

// The same line, when it carries a rule the operator must not miss — the
// workspace/customer distinction, or the fact that a setting stops at one
// company.
export const HermesAdminRuleNote = styled.p`
  border-left: 1px solid ${themeCssVariables.border.color.strong};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  margin: 0;
  overflow-wrap: anywhere;
  padding-left: ${themeCssVariables.spacing[2]};
`;
