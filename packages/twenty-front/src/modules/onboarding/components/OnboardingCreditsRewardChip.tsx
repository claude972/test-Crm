import { useLingui } from '@lingui/react/macro';
import { IconCoins } from 'kovaa-lab-ui/icon';
import { Badge } from 'kovaa-lab-ui/primitives/data-display';

type OnboardingCreditsRewardChipProps = {
  formattedCreditsReward: string;
  isRewardPerItem?: boolean;
};

export const OnboardingCreditsRewardChip = ({
  formattedCreditsReward,
  isRewardPerItem = false,
}: OnboardingCreditsRewardChipProps) => {
  const { t } = useLingui();

  return (
    <Badge size="md" color="inherit">
      <IconCoins aria-hidden />
      {isRewardPerItem
        ? t`+${formattedCreditsReward} each`
        : `+${formattedCreditsReward}`}
    </Badge>
  );
};
