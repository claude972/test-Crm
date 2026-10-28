import { formatAiChatTokens } from '@/ai/utils/formatAiChatTokens';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { MetricRow } from 'kovaa-lab-ui/components/data-display';
import { Separator } from 'kovaa-lab-ui/primitives/layout';
import {
  IconArrowUp,
  IconArrowDown,
  IconCoins,
  IconHistory,
} from 'kovaa-lab-ui/icon';
import { themeCssVariables, useTheme } from 'kovaa-lab-ui/theme';

import { agentChatUsageFamilyState } from '@/ai/states/agentChatUsageFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { formatNumber } from '@/localization/utils/formatNumber';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSectionTitle = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 20px;
`;

export const AiChatContextUsageDetails = () => {
  const { t } = useLingui();
  const theme = useTheme();
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const agentChatUsage = useAtomFamilyStateValue(agentChatUsageFamilyState, {
    threadId: currentAiChatThread,
  });
  if (!isDefined(agentChatUsage)) {
    return null;
  }

  const lastMessage = agentChatUsage.lastMessage;

  return (
    <>
      {isDefined(lastMessage) && (
        <>
          <Separator />
          <StyledSection>
            <StyledSectionTitle>{t`Last message`}</StyledSectionTitle>
            <MetricRow
              startIcon={<IconArrowUp size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.inputTokens)}
            >
              {t`Input tokens`}
            </MetricRow>
            <MetricRow
              startIcon={<IconHistory size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.cachedInputTokens)}
            >
              {t`Cached input`}
            </MetricRow>
            <MetricRow
              startIcon={<IconArrowDown size={theme.icon.size.sm} />}
              value={formatAiChatTokens(lastMessage.outputTokens)}
            >
              {t`Output tokens`}
            </MetricRow>
            <MetricRow
              startIcon={<IconCoins size={theme.icon.size.sm} />}
              value={formatNumber(
                lastMessage.inputCredits + lastMessage.outputCredits,
                { decimals: 3 },
              )}
            >
              {t`Credits`}
            </MetricRow>
          </StyledSection>
        </>
      )}
      <Separator />
      <StyledSection>
        <StyledSectionTitle>{t`Conversation`}</StyledSectionTitle>
        <MetricRow
          startIcon={<IconArrowUp size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.inputTokens)}
        >
          {t`Input tokens`}
        </MetricRow>
        <MetricRow
          startIcon={<IconHistory size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.cachedInputTokens)}
        >
          {t`Cached input`}
        </MetricRow>
        <MetricRow
          startIcon={<IconArrowDown size={theme.icon.size.sm} />}
          value={formatAiChatTokens(agentChatUsage.outputTokens)}
        >
          {t`Output tokens`}
        </MetricRow>
        <MetricRow
          startIcon={<IconCoins size={theme.icon.size.sm} />}
          value={formatNumber(
            agentChatUsage.inputCredits + agentChatUsage.outputCredits,
            { decimals: 3 },
          )}
        >
          {t`Credits`}
        </MetricRow>
      </StyledSection>
    </>
  );
};
