import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Link } from 'react-router-dom';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconClock,
  IconHelpCircle,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';

import { MessagingInboxInstantLabel } from '@/messaging-inbox/components/MessagingInboxInstantLabel';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledLink = styled(Link)`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  text-decoration: none;
  width: fit-content;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

type MessagingInboxConnectionNoteProps = {
  channel: MessagingInboxChannel;
  read: MessagingInboxConnectionRead;
};

// One channel's configuration state, said in the contract's own terms.
//
// The line that matters: CONFIGURED_UNVERIFIED is NOT connected. It is shown
// as set up and unverified, and only AVAILABLE is shown as confirmed by the
// provider. A failed read says unknown and offers nothing, because it is not
// evidence of anything.
//
// "Not set up" sends the operator to the page that actually owns the setup:
// the native e-mail accounts page for e-mail — the encrypted native accounts
// are what this inbox reuses, and no secret goes through the browser — and the
// integrations page for WhatsApp.
export const MessagingInboxConnectionNote = ({
  channel,
  read,
}: MessagingInboxConnectionNoteProps) => {
  const { t } = useLingui();

  const setupPath =
    channel === 'EMAIL'
      ? getSettingsPath(SettingsPath.AccountsEmails)
      : getSettingsPath(SettingsPath.Integrations);

  if (read.kind === 'loading') {
    return (
      <MessagingInboxNote>
        <Trans>Checking the connection…</Trans>
      </MessagingInboxNote>
    );
  }

  // A read that failed tells us nothing about the setup. Anything other than
  // unknown here would invent a state the server never sent.
  if (read.kind === 'unknown') {
    return (
      <StyledRow>
        <Tag
          color="gray"
          variant="outline"
          borderStyle="dashed"
          truncate={false}
          startIcon={<IconHelpCircle />}
        >
          {t`Connection unknown`}
        </Tag>
      </StyledRow>
    );
  }

  // The contract's own rule: no registered connection means NOT_CONFIGURED,
  // never a synthetic connection. This beta lists only explicitly ingested
  // shared connections, so an absent channel is genuinely nothing set up.
  if (read.kind === 'absent') {
    return (
      <StyledRow>
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`Not set up`}
        </Tag>
        <StyledLink to={setupPath}>{t`Open settings`}</StyledLink>
      </StyledRow>
    );
  }

  const { connection } = read;

  const stateTag =
    connection.state === null ? (
      <Tag
        color="gray"
        variant="outline"
        borderStyle="dashed"
        truncate={false}
        startIcon={<IconHelpCircle />}
      >
        {isNonEmptyString(connection.unknownState)
          ? connection.unknownState
          : t`Connection unknown`}
      </Tag>
    ) : connection.state === 'NOT_CONFIGURED' ? (
      <Tag
        color="gray"
        variant="soft"
        truncate={false}
        startIcon={<IconCircleOff />}
      >
        {t`Not set up`}
      </Tag>
    ) : connection.state === 'CONFIGURED_UNVERIFIED' ? (
      // Set up, and nothing has confirmed it. Deliberately not "connected".
      <Tag
        color="orange"
        variant="soft"
        truncate={false}
        startIcon={<IconClock />}
      >
        {t`Set up, not verified`}
      </Tag>
    ) : connection.state === 'AVAILABLE' ? (
      <Tag
        color="green"
        variant="soft"
        truncate={false}
        startIcon={<IconCheck />}
      >
        {t`Available`}
      </Tag>
    ) : (
      <Tag
        color="red"
        variant="soft"
        truncate={false}
        startIcon={<IconAlertTriangle />}
      >
        {t`Unavailable`}
      </Tag>
    );

  return (
    <StyledRow>
      {stateTag}

      {connection.state === 'NOT_CONFIGURED' && (
        <StyledLink to={setupPath}>{t`Open settings`}</StyledLink>
      )}

      {/* canSend and canSync describe allowed operations independently of the
          state, so they are shown on their own and never inferred from it. */}
      {connection.canSend === false && (
        <Tag color="gray" variant="soft" truncate={false}>
          {t`Replies off`}
        </Tag>
      )}

      {!isDefined(connection.canSend) && (
        <Tag
          color="gray"
          variant="outline"
          borderStyle="dashed"
          truncate={false}
          startIcon={<IconHelpCircle />}
        >
          {t`Replies unknown`}
        </Tag>
      )}

      {!connection.canSync && (
        <Tag color="gray" variant="soft" truncate={false}>
          {t`Sync off`}
        </Tag>
      )}

      {/* Media, voice and rich e-mail are named one by one when the server
          says they are not available. Saying nothing would leave the operator
          to discover the limit by trying, and a capability nobody confirmed is
          never offered. These are not errors: the connection can be healthy
          and still carry text only. */}
      {channel === 'WHATSAPP' && !connection.canReceiveMedia && (
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`Incoming media unavailable`}
        </Tag>
      )}

      {channel === 'WHATSAPP' && !connection.canSendMedia && (
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`Sending media unavailable`}
        </Tag>
      )}

      {channel === 'WHATSAPP' && !connection.canRecordVoice && (
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`Voice messages unavailable`}
        </Tag>
      )}

      {channel === 'EMAIL' && !connection.canComposeRichEmail && (
        <Tag
          color="gray"
          variant="soft"
          truncate={false}
          startIcon={<IconCircleOff />}
        >
          {t`Attachments and formatting unavailable`}
        </Tag>
      )}

      {isNonEmptyString(connection.errorCode) && (
        <Tag
          color="red"
          variant="outline"
          truncate={false}
          startIcon={<IconAlertTriangle />}
        >
          {connection.errorCode}
        </Tag>
      )}

      <StyledMeta>
        <Trans>Checked</Trans>{' '}
        <MessagingInboxInstantLabel value={connection.lastCheckedAt} />
      </StyledMeta>
    </StyledRow>
  );
};
