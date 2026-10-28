import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { type IconComponent } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

type SettingsApplicationNotFoundProps = {
  message: string;
  linkTo: string;
  linkLabel: string;
  LinkIcon: IconComponent;
};

const StyledContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export const SettingsApplicationNotFound = ({
  message,
  linkTo,
  linkLabel,
  LinkIcon,
}: SettingsApplicationNotFoundProps) => {
  return (
    <StyledContainer role="status">
      <div>{message}</div>
      <Button
        startIcon={<LinkIcon />}
        variant="outline"
        size="sm"
        nativeButton={false}
        role="link"
        render={<Link to={linkTo} />}
      >
        {linkLabel}
      </Button>
    </StyledContainer>
  );
};
