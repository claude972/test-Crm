import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconFolder } from 'kovaa-lab-ui/icon';
import { useTheme, themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledEmptyState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[8]};
  text-align: center;
`;

export const SettingsMessageFoldersEmptyStateCard = () => {
  const theme = useTheme();

  return (
    <Section.Root>
      <StyledEmptyState>
        <IconFolder size={theme.icon.size.md} />
        <div>{t`No folders found for this account`}</div>
      </StyledEmptyState>
    </Section.Root>
  );
};
