import { styled } from '@linaria/react';
import React from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Text } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledGroupHeadingContainer = styled.div`
  align-items: center;
  padding-bottom: ${themeCssVariables.spacing[1]};
  padding-left: ${themeCssVariables.spacing[1]};
  padding-right: ${themeCssVariables.spacing[1]};
  padding-top: ${themeCssVariables.spacing[2]};
  user-select: none;
`;

const StyledGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
`;

type SidePanelGroupProps = {
  heading: string;
  children: React.ReactNode | React.ReactNode[];
};

export const SidePanelGroup = ({ heading, children }: SidePanelGroupProps) => {
  if (!isDefined(children) || !React.Children.count(children)) {
    return null;
  }
  return (
    <>
      <StyledGroupHeadingContainer>
        <Text size="xs" weight="semibold" color="light">
          {heading}
        </Text>
      </StyledGroupHeadingContainer>
      <StyledGroup>{children}</StyledGroup>
    </>
  );
};
