import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined, isNonEmptyArray } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconHash } from 'kovaa-lab-ui/icon';
import { Collapsible } from 'kovaa-lab-ui/primitives/layout';
import { Card } from 'kovaa-lab-ui/primitives/surfaces';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { SettingsRolePermissionsAgentChatChannelTableRow } from '@/settings/roles/role-permissions/agent-chat-channels/components/SettingsRolePermissionsAgentChatChannelTableRow';
import { useRoleAgentChatChannelIds } from '@/settings/roles/role-permissions/agent-chat-channels/hooks/useRoleAgentChatChannelIds';
import { useSettingsAgentChatChannels } from '@/settings/roles/role-permissions/agent-chat-channels/hooks/useSettingsAgentChatChannels';
import { useToggleRoleAgentChatChannelAccess } from '@/settings/roles/role-permissions/agent-chat-channels/hooks/useToggleRoleAgentChatChannelAccess';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { settingsPersistedRoleFamilyState } from '@/settings/roles/states/settingsPersistedRoleFamilyState';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';

const StyledCardContainer = styled.div`
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledTable = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledTableRows = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

type SettingsRolePermissionsAgentChatChannelsSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsAgentChatChannelsSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsAgentChatChannelsSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );
  // Channels list the roles they open to, so a role picks them once it exists
  const isRoleSaved = isDefined(
    useAtomFamilyStateValue(settingsPersistedRoleFamilyState, roleId),
  );
  const settingsAgentChatChannels = useSettingsAgentChatChannels();
  const roleAgentChatChannelIds = useRoleAgentChatChannelIds(roleId);
  const { toggleRoleAgentChatChannelAccess } =
    useToggleRoleAgentChatChannelAccess(roleId);

  return (
    <Section.Root>
      <Section.Header
        title={t`Channels`}
        description={t`Chat channels this role reads and replies in`}
      />
      <StyledCardContainer>
        <Card.Root>
          <SettingsOptionCardContentSwitch
            Icon={IconHash}
            title={t`All channels`}
            description={t`Every channel, including the ones created later`}
            checked={settingsDraftRole.canAccessAllAgentChatChannels}
            disabled={!isEditable}
            onChange={() =>
              setSettingsDraftRole({
                ...settingsDraftRole,
                canAccessAllAgentChatChannels:
                  !settingsDraftRole.canAccessAllAgentChatChannels,
              })
            }
          />
        </Card.Root>
      </StyledCardContainer>
      {isRoleSaved && isNonEmptyArray(settingsAgentChatChannels) && (
        <Collapsible.Root
          open={!settingsDraftRole.canAccessAllAgentChatChannels}
        >
          <Collapsible.Panel
            dimension="height"
            style={{ transitionDuration: '0.4s, 0.2s' }}
            containAnimation={false}
          >
            <StyledTable>
              <TableRow gridAutoColumns="1fr 24px">
                <TableHeader>{t`Name`}</TableHeader>
                <TableHeader />
              </TableRow>
              <StyledTableRows>
                {settingsAgentChatChannels.map((channel) => (
                  <SettingsRolePermissionsAgentChatChannelTableRow
                    key={channel.id}
                    channel={channel}
                    isChecked={roleAgentChatChannelIds.includes(channel.id)}
                    isEditable={isEditable}
                    onToggle={() =>
                      toggleRoleAgentChatChannelAccess(channel.id)
                    }
                  />
                ))}
              </StyledTableRows>
            </StyledTable>
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </Section.Root>
  );
};
