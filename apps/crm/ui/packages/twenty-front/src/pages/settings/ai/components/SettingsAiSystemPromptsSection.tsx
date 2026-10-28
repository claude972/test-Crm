import { SettingsCard } from '@/settings/components/SettingsCard';
import { useQuery } from '@apollo/client/react';
import { t } from '@lingui/core/macro';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconPrompt } from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';
import { GetAiSystemPromptPreviewDocument } from '~/generated-metadata/graphql';
import { formatNumber } from '@/localization/utils/formatNumber';

export const SettingsAiSystemPromptsSection = () => {
  const theme = useTheme();
  const { data: previewData } = useQuery(GetAiSystemPromptPreviewDocument);

  const systemPromptTokenCount =
    previewData?.getAiSystemPromptPreview.estimatedTokenCount;
  const systemPromptDescription = isDefined(systemPromptTokenCount)
    ? t`Read the system prompts to understand how the AI works (~${formatNumber(
        systemPromptTokenCount,
        { abbreviate: true, decimals: 1 },
      )} tokens)`
    : t`Read the system prompts to understand how the AI works`;

  return (
    <Section.Root>
      <Section.Header
        title={t`System Prompt`}
        description={systemPromptDescription}
      />
      <SettingsCard
        to={getSettingsPath(SettingsPath.AiPrompts)}
        Icon={<IconPrompt size={theme.icon.size.md} />}
        title={t`Read system prompts`}
      />
    </Section.Root>
  );
};
