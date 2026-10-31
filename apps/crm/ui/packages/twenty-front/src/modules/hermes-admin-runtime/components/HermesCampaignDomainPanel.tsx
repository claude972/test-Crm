import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { useHermesCampaignDomainSetup } from '@/hermes-admin-runtime/hooks/useHermesCampaignDomainSetup';
import { SettingsEmailingDomainDnsRecords } from '@/settings/emailing-domains/components/SettingsEmailingDomainDnsRecords';
import { SettingsEmailingDomainVerifyButton } from '@/settings/emailing-domains/components/SettingsEmailingDomainVerifyButton';
import {
  type EmailingDomain,
  EmailingDomainStatus,
  UnsubscribeHostnameStatus,
} from '~/generated-metadata/graphql';

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

export type HermesCampaignDomainRecord = Pick<
  EmailingDomain,
  'id' | 'domain' | 'status' | 'unsubscribeHostnameStatus' | 'verificationRecords'
>;

type HermesCampaignDomainPanelProps = {
  // The registered mailbox's own domain. Not an input: offering a free text
  // field here is how a company records a domain it does not send from.
  domain: string;
  // What the server published for that domain, or null when it holds none.
  record: HermesCampaignDomainRecord | null;
  refetchDomains: () => Promise<unknown>;
};

// Recording and checking the campaign domain of the company's own mailbox.
//
// This is deliberately NOT the email-group flow: that one creates a forwarding
// channel at a third-party provider, which is the wrong shape for a company
// sending through its own native SMTP. Here the domain is the mailbox's, the
// record is created directly, and the check is the server's.
export const HermesCampaignDomainPanel = ({
  domain,
  record,
  refetchDomains,
}: HermesCampaignDomainPanelProps) => {
  const { t } = useLingui();

  const { outcome, loading, recordDomain, retryDomainsRead } =
    useHermesCampaignDomainSetup({ refetchDomains });

  if (record === null) {
    return (
      <StyledPanel>
        <HermesAdminNote role="status">
          {t`The server holds no campaign domain for ${domain}. Recording it creates the domain; it does not verify it, and it is not a claim that a send would work.`}
        </HermesAdminNote>

        {outcome.kind === 'refused' && (
          <HermesAdminNote role="alert">
            {outcome.reason !== null
              ? t`The server refused to record this domain: ${outcome.reason}`
              : t`The server refused to record this domain. Nothing was written.`}
          </HermesAdminNote>
        )}

        {outcome.kind === 'unconfirmed' && (
          <HermesAdminNote role="alert">
            {t`The server's answer could not be read, so the recording is neither confirmed nor denied. Re-read the domains before trying again, so you do not create a second record.`}
          </HermesAdminNote>
        )}

        {outcome.kind === 'write-unknown' && (
          <HermesAdminNote role="alert">
            {outcome.listReread
              ? t`The answer never reached us: we do not know whether the domain was recorded. The domains have been re-read — if ${domain} now appears, the recording did happen.`
              : t`The answer never reached us: we do not know whether the domain was recorded. Do not record it again — re-read the domains to see whether it is there.`}
          </HermesAdminNote>
        )}

        {(outcome.kind === 'recorded-not-reread' ||
          outcome.kind === 'rereading') && (
          <HermesAdminNote role="status">
            {t`Domain recorded, not verified. The domain list could not be re-read, so it may be incomplete on screen. The record exists on the server — do not create it again.`}
          </HermesAdminNote>
        )}

        <StyledActions>
          {/* A write whose answer was lost may have been applied, so sending
              again is withheld rather than offered: the recovery is a re-read. */}
          {outcome.kind !== 'write-unknown' &&
            outcome.kind !== 'recorded-not-reread' &&
            outcome.kind !== 'rereading' && (
              <Button
                type="button"
                variant="solid"
                size="sm"
                loading={loading || outcome.kind === 'recording'}
                disabled={loading || outcome.kind === 'recording'}
                onClick={() => {
                  void recordDomain(domain);
                }}
              >
                {t`Record this domain`}
              </Button>
            )}

          {(outcome.kind === 'write-unknown' ||
            outcome.kind === 'recorded-not-reread' ||
            outcome.kind === 'rereading') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={outcome.kind === 'rereading'}
              disabled={outcome.kind === 'rereading'}
              onClick={() => {
                void retryDomainsRead();
              }}
            >
              {t`Re-read the domains`}
            </Button>
          )}
        </StyledActions>
      </StyledPanel>
    );
  }

  const isReady =
    record.status === EmailingDomainStatus.VERIFIED &&
    record.unsubscribeHostnameStatus === UnsubscribeHostnameStatus.ACTIVE;

  if (isReady) {
    return null;
  }

  const hasPublishedRecords = (record.verificationRecords ?? []).length > 0;

  return (
    <StyledPanel>
      <HermesAdminNote role="status">
        {t`Checking asks the server to verify ${record.domain}. The verdict is the server's, not this form's, and the status above is what it last reported — re-read the domains to see a new one.`}
      </HermesAdminNote>

      <StyledActions>
        <SettingsEmailingDomainVerifyButton emailingDomainId={record.id} />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchDomains();
          }}
        >
          {t`Re-read the domains`}
        </Button>
      </StyledActions>

      {/* Only when the server actually published records to add. Sending a
          company through its own SMTP mailbox authorises through that mailbox,
          so asking for DNS entries it never published would be busywork. */}
      {hasPublishedRecords && (
        <SettingsEmailingDomainDnsRecords emailingDomain={record} />
      )}
    </StyledPanel>
  );
};
