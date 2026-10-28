import { useLingui } from '@lingui/react/macro';
import { PermissionFlagType } from 'kovaa-lab-shared/constants';
import { LightIconButton } from 'kovaa-lab-ui/components/input';
import { IconSparkles } from 'kovaa-lab-ui/icon';

import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useOpenAskAiPageInSidePanel } from '@/side-panel/hooks/useOpenAskAiPageInSidePanel';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';

export const SettingsValidationRuleAskAiButton = () => {
  const { t } = useLingui();
  const hasAiPermission = useHasPermissionFlag(PermissionFlagType.AI);
  const { openAskAiPage } = useOpenAskAiPageInSidePanel();
  const workspaceSurface = useWorkspaceSurface();

  if (!hasAiPermission || workspaceSurface.type === 'side-panel') {
    return null;
  }

  return (
    <LightIconButton
      aria-label={t`Ask AI`}
      onClick={() => openAskAiPage({ resetNavigationStack: true })}
    >
      <IconSparkles />
    </LightIconButton>
  );
};
