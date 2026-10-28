import { INTERNAL_CREDITS_PER_DISPLAY_CREDIT } from 'kovaa-lab-shared/constants';

import { useUsageValueFormatter } from '@/settings/usage/hooks/useUsageValueFormatter';

type LogConsoleCreditsProps = {
  creditsUsedMicro: number;
};

export const LogConsoleCredits = ({
  creditsUsedMicro,
}: LogConsoleCreditsProps) => {
  const { formatUsageValue } = useUsageValueFormatter();

  return formatUsageValue(
    creditsUsedMicro / INTERNAL_CREDITS_PER_DISPLAY_CREDIT,
  );
};
