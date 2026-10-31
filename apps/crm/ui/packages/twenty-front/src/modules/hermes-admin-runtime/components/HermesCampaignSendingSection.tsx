import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconMailCog, IconSend } from 'kovaa-lab-ui/icon';
import { Status } from 'kovaa-lab-ui/primitives/data-display';
import { Card } from 'kovaa-lab-ui/primitives/surfaces';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { useHermesMailboxRuntimeIdentity } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
import {
  HERMES_ADMIN_RUNTIME_PATH,
  HERMES_CAMPAIGN_LIST_PATH,
} from '@/hermes-shell/constants/HermesRuntimeRoutePaths';
import { getEmailChannelDomain } from '@/settings/accounts/utils/getEmailChannelDomain';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { getEmailingDomainStatusDisplay } from '@/settings/emailing-domains/utils/getEmailingDomainStatusDisplay';
import {
  EmailingDomainStatus,
  GetEmailingDomainsDocument,
  UnsubscribeHostnameStatus,
} from '~/generated-metadata/graphql';

const StyledCardsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledReadout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

// Which mailbox a campaign may be recorded as sending from, and what the server
// says about that mailbox's domain — both read from the authority that enforces
// them, never from a name, a list or a path.
//
// Two separate authorities, kept separate: the central MAIL connection names
// the registered account, and `getEmailingDomains` holds the sending domain.
// Either can be unknown while the other answers, and an unknown one is said to
// be unknown. Nothing here writes, and nothing here claims a send would work.
export const HermesCampaignSendingSection = () => {
  const { t } = useLingui();

  const { identity } = useHermesMailboxRuntimeIdentity();

  const mailboxAddress =
    identity.kind === 'known' ? identity.mailboxAddress : null;

  const mailboxDomain = getEmailChannelDomain(mailboxAddress);

  const {
    data: domainsData,
    loading: domainsLoading,
    error: domainsError,
  } = useQuery(GetEmailingDomainsDocument, {
    skip: mailboxDomain === undefined,
  });

  const domainRecord = domainsData?.getEmailingDomains?.find(
    (domain) => domain.domain.toLowerCase() === mailboxDomain,
  );

  const domainDisplay = isDefined(domainRecord)
    ? getEmailingDomainStatusDisplay(domainRecord.status)
    : null;

  // The native rule, unchanged: a verified domain whose unsubscribe record is
  // not active sends ordinary mail but not campaigns.
  const isUnsubscribeRecordPending =
    isDefined(domainRecord) &&
    domainRecord.status === EmailingDomainStatus.VERIFIED &&
    domainRecord.unsubscribeHostnameStatus !==
      UnsubscribeHostnameStatus.ACTIVE;

  return (
    <Section.Root>
      <Section.Header
        title={t`Campaign sending`}
        description={t`The mailbox a campaign may be recorded as sending from, and what the server says about its domain`}
      />

      <Card.Root>
        <StyledReadout>
          {identity.kind === 'unknown' ? (
            <HermesAdminNote
              role={identity.reason === 'loading' ? 'status' : 'alert'}
            >
              {identity.reason === 'loading'
                ? t`Reading which mailbox is registered…`
                : identity.reason === 'notConfigured'
                  ? t`No incoming-mail connection is configured, so no mailbox is registered as a campaign sender yet. Configure one in the connections centre below.`
                  : identity.reason === 'unreadable'
                    ? t`The registered mailbox could not be read, so it is unknown which address a campaign may send from. The connections centre below re-reads it; nothing is assumed in the meantime.`
                    : t`An incoming-mail connection is configured and no native account answers to it — the binding moved, or the account was renamed. No mailbox is proposed until that is resolved in the connections centre below.`}
            </HermesAdminNote>
          ) : (
            <HermesAdminNote role="status">
              {t`Registered mailbox: ${identity.mailboxAddress}. A campaign may be recorded as sending from this address. Recording it is not an authorisation: the server resolves the sender again when the campaign departs, and can still refuse.`}
            </HermesAdminNote>
          )}

          {identity.kind === 'known' && mailboxDomain !== undefined && (
            <>
              {domainsLoading && !isDefined(domainsData) ? (
                <HermesAdminNote role="status">
                  {t`Reading the campaign domain…`}
                </HermesAdminNote>
              ) : isDefined(domainsError) ? (
                <HermesAdminNote role="alert">
                  {t`The campaign domains could not be read, so the state of ${mailboxDomain} is unknown. It is neither verified nor refused here.`}
                </HermesAdminNote>
              ) : !isDefined(domainRecord) || domainDisplay === null ? (
                <HermesAdminNote role="alert">
                  {t`No emailing domain record covers ${mailboxDomain}. The server checks the sending domain when a campaign departs, and nothing read here establishes that it would accept this one.`}
                </HermesAdminNote>
              ) : (
                <>
                  <HermesAdminNote role="status">
                    {t`Campaign domain ${domainRecord.domain}, as the server reports it:`}{' '}
                    <Status color={domainDisplay.color}>
                      {domainDisplay.label}
                    </Status>
                  </HermesAdminNote>

                  {isUnsubscribeRecordPending && (
                    <HermesAdminNote role="alert">
                      {t`The unsubscribe record of this domain is not active. The server reports the domain as verified for ordinary mail; campaigns need that record too.`}
                    </HermesAdminNote>
                  )}
                </>
              )}
            </>
          )}
        </StyledReadout>
      </Card.Root>

      <StyledCardsColumn>
        <SettingsCard
          Icon={<IconMailCog />}
          title={t`Mailbox and connections`}
          description={t`Add the native IMAP and SMTP mailbox of this company and bind incoming mail to it`}
          to={HERMES_ADMIN_RUNTIME_PATH}
        />
        <SettingsCard
          Icon={<IconSend />}
          title={t`Campaigns`}
          description={t`Record which mailbox a campaign sends from, and read the server's verdict on it`}
          to={HERMES_CAMPAIGN_LIST_PATH}
        />
      </StyledCardsColumn>
    </Section.Root>
  );
};
