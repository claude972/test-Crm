import {
  StyledSettingsCardContent,
  StyledSettingsCardDescription,
  StyledSettingsCardIcon,
  StyledSettingsCardTextContainer,
  StyledSettingsCardTitle,
} from '@/settings/components/SettingsOptions/SettingsCardContentBase';
import { SettingsOptionIconCustomizer } from '@/settings/components/SettingsOptions/SettingsOptionIconCustomizer';
import { styled } from '@linaria/react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { type IconComponent } from 'kovaa-lab-ui/icon';

type SettingsOptionCardContentButtonProps = {
  Icon?: IconComponent;
  title: React.ReactNode;
  description?: string;
  Button?: React.ReactNode;
};

const StyledButtonContainer = styled.div`
  flex-shrink: 0;
  margin-left: auto;
`;

export const SettingsOptionCardContentButton = ({
  Icon,
  title,
  description,
  Button,
}: SettingsOptionCardContentButtonProps) => {
  return (
    <StyledSettingsCardContent>
      {Icon && (
        <StyledSettingsCardIcon>
          <SettingsOptionIconCustomizer Icon={Icon} />
        </StyledSettingsCardIcon>
      )}
      <StyledSettingsCardTextContainer>
        <StyledSettingsCardTitle>{title}</StyledSettingsCardTitle>
        {description && (
          <StyledSettingsCardDescription>
            <OverflowingTextWithTooltip text={description} />
          </StyledSettingsCardDescription>
        )}
      </StyledSettingsCardTextContainer>
      {isDefined(Button) && (
        <StyledButtonContainer>{Button}</StyledButtonContainer>
      )}
    </StyledSettingsCardContent>
  );
};
