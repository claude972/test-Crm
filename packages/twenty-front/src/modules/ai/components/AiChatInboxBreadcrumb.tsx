import { styled } from '@linaria/react';
import { AppPath } from 'kovaa-lab-shared/types';
import { getAppPath } from 'kovaa-lab-shared/utils';
import { themeCssVariables, useTheme } from 'kovaa-lab-ui/theme';

import { useAgentChatInboxViewHeading } from '@/ai/hooks/useAgentChatInboxViewHeading';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';

const StyledBreadcrumb = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  white-space: nowrap;
`;

export const AiChatInboxBreadcrumb = () => {
  const theme = useTheme();
  const { HeadingIcon, headingLabel } = useAgentChatInboxViewHeading();

  return (
    <UndecoratedLink to={getAppPath(AppPath.AiChatInbox, { threadId: null })}>
      <StyledBreadcrumb>
        <HeadingIcon size={theme.icon.size.md} />
        {headingLabel}
        <span aria-hidden>/</span>
      </StyledBreadcrumb>
    </UndecoratedLink>
  );
};
