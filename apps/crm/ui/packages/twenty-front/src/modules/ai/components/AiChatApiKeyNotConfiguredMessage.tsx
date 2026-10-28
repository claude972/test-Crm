import { InlineBanner } from 'kovaa-lab-ui/components/feedback';
import { AiChatInlineBanner } from '@/ai/components/AiChatInlineBanner';
import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { getDocumentationUrl } from '@/support/utils/getDocumentationUrl';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { DOCUMENTATION_PATHS } from 'kovaa-lab-shared/constants';
import { IconExternalLink } from 'kovaa-lab-ui/icon';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';

export const AiChatApiKeyNotConfiguredMessage = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const handleDocsClick = () => {
    const docsUrl = getDocumentationUrl({
      locale: currentWorkspaceMember?.locale,
      path: DOCUMENTATION_PATHS.DEVELOPERS_SELF_HOST_CAPABILITIES_SETUP,
    });
    openUrlInNewTab(docsUrl);
  };

  return (
    <AiChatInlineBanner
      action={
        <InlineBanner.Action
          startIcon={<IconExternalLink />}
          onClick={handleDocsClick}
        >{t`View Docs`}</InlineBanner.Action>
      }
    >{t`Add an API key to enable AI.`}</AiChatInlineBanner>
  );
};
