import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { KOVAALAB_CLI_CREATE_APP_COMMANDS } from '@/settings/developers/constants/KovaaLab CRMCliCreateAppCommands';
import { KOVAALAB_CLI_LOGIN_COMMAND } from '@/settings/developers/constants/KovaaLab CRMCliLoginCommand';
import { getDocumentationUrl } from '@/support/utils/getDocumentationUrl';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { CommandBlock } from 'kovaa-lab-ui/components/data-display';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconArrowUpRight, IconCopy } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import { openUrlInNewTab } from '~/utils/openUrlInNewTab';

const CLI_COMMAND_REFERENCE_URL =
  'https://github.com/kovaa-lab/kovaa-lab/blob/main/packages/kovaa-lab-cli/docs/commands.md';

const StyledButtonContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  margin-top: ${themeCssVariables.spacing[2]};
`;

type SettingsDevelopersCliCommandSectionProps = {
  title: string;
  description: string;
  commands: string[];
  children?: ReactNode;
};

const SettingsDevelopersCliCommandSection = ({
  title,
  description,
  commands,
  children,
}: SettingsDevelopersCliCommandSectionProps) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();

  return (
    <Section.Root>
      <Section.Header title={title} description={description} />
      <CommandBlock
        commands={commands}
        actions={
          <Button
            onClick={() =>
              copyToClipboard(
                commands.join('\n'),
                t`Commands copied to clipboard`,
              )
            }
            aria-label={t`Copy commands`}
            startIcon={<IconCopy />}
          />
        }
      />
      {children}
    </Section.Root>
  );
};

export const SettingsDevelopersCliTab = () => {
  const { t } = useLingui();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  return (
    <>
      <SettingsDevelopersCliCommandSection
        title={t`Connect to this workspace`}
        description={t`Sign in from your browser and make this workspace your default connection. Requires Node.js 24.5 or later.`}
        commands={doNotTranslate([
          KOVAALAB_CLI_LOGIN_COMMAND,
          'npx kovaa-lab@latest auth status',
        ])}
      />

      <SettingsDevelopersCliCommandSection
        title={t`Explore your data`}
        description={t`Inspect the data model, query records and send raw API requests.`}
        commands={doNotTranslate([
          'npx kovaa-lab@latest metadata object list',
          'npx kovaa-lab@latest data list companies --limit 5',
          "npx kovaa-lab@latest api rest '/rest/people?limit=5'",
        ])}
      />

      <SettingsDevelopersCliCommandSection
        title={t`Build an app`}
        description={t`Scaffold an app, register it in this workspace and sync your changes as you code.`}
        commands={KOVAALAB_CLI_CREATE_APP_COMMANDS}
      >
        <StyledButtonContainer>
          <Button
            startIcon={<IconArrowUpRight />}
            size="sm"
            variant="ghost"
            onClick={() => openUrlInNewTab(CLI_COMMAND_REFERENCE_URL)}
          >{t`Command reference`}</Button>
          <Button
            startIcon={<IconArrowUpRight />}
            size="sm"
            variant="outline"
            onClick={() =>
              openUrlInNewTab(
                getDocumentationUrl({
                  locale: currentWorkspaceMember?.locale,
                  path: '/developers/extend/apps/operations/cli',
                }),
              )
            }
          >{t`Read documentation`}</Button>
        </StyledButtonContainer>
      </SettingsDevelopersCliCommandSection>
    </>
  );
};
