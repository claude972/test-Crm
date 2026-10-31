import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { RadioGroup } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesSenderIdentityCard } from '@/hermes-campaigns-ui/components/HermesSenderIdentityCard';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';
import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { readSenderIdentityAuthorization } from '@/hermes-campaigns-ui/utils/readSenderIdentityAuthorization';

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledSaveStatus = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

type HermesSenderIdentitySectionProps = {
  // Loading, never configured, empty, refused or ready — five answers, told
  // apart.
  load: HermesCampaignLoad<HermesSenderIdentity[]>;
  // The identity currently chosen. Null while none is.
  selectedIdentityId: string | null;
  // Called with the identity the person picked. Only an authorised identity
  // can be picked, because the others are disabled.
  onSelectIdentity: (identityId: string) => void;
  onRetry?: () => void;
  // How recording the chosen sender went. Picking an identity stores it on
  // the campaign, so the choice survives a reload; this says whether that
  // recording actually happened.
  saveState: HermesCampaignSaveState;
};

export const HermesSenderIdentitySection = ({
  load,
  selectedIdentityId,
  onSelectIdentity,
  onRetry,
  saveState,
}: HermesSenderIdentitySectionProps) => {
  const { t } = useLingui();

  const identities = load.kind === 'ready' ? load.value : [];

  const authorizations = useMemo(
    () =>
      new Map(
        identities.map((identity) => [
          identity.id,
          readSenderIdentityAuthorization(identity),
        ]),
      ),
    [identities],
  );

  return (
    <Section.Root>
      <Section.Header
        title={t`Sender identity`}
        description={t`The mailbox actually delegated, not just the domain.`}
      />

      <HermesCampaignLoadView
        load={load}
        emptyTitle={t`No sender identity`}
        emptyDescription={t`Campaigns, audiences and sender identities are partitioned by operating company.`}
        notConfiguredTitle={t`No outgoing mailbox connected`}
        notConfiguredDescription={t`A delegated mailbox is set up in Settings, under Connections. Until then no identity exists and nothing can be sent.`}
        failedTitle={t`Sender identities could not be read`}
        onRetry={onRetry}
      >
        <StyledList>
          <RadioGroup
            aria-label={t`Sender identity`}
            value={selectedIdentityId ?? null}
            onValueChange={(value) => {
              if (typeof value === 'string') {
                onSelectIdentity(value);
              }
            }}
            render={<StyledList />}
          >
            {identities.map((identity) => {
              const authorization = authorizations.get(identity.id);

              if (!isDefined(authorization)) {
                return null;
              }

              return (
                <HermesSenderIdentityCard
                  key={identity.id}
                  identity={identity}
                  authorization={authorization}
                  isSelected={identity.id === selectedIdentityId}
                />
              );
            })}
          </RadioGroup>

          {/* Picking an identity records it on the campaign, so the choice
              survives a reload. The recording is said out loud, because a
              choice that only lived on screen is exactly the defect this
              replaced. */}
          <StyledSaveStatus aria-live="polite">
            {saveState.kind === 'saving' && t`Recording the sender…`}
            {saveState.kind === 'saved' &&
              t`Sender recorded on the campaign. It will still be here after a reload.`}
            {saveState.kind === 'failed' &&
              t`The server refused to record this sender. The campaign still holds the previous one.`}
            {saveState.kind === 'unconfirmed' &&
              t`The outcome of recording this sender is not known. Reload the campaign to see which one it holds; nothing is retried on its own.`}
          </StyledSaveStatus>

          <HermesCampaignNote>
            <Trans>
              The domain, the displayed address, the connection login and the
              mailbox actually delegated are four separate facts. An identity
              on the right domain but without a delegation is refused, and its
              reason is shown next to it.
            </Trans>
          </HermesCampaignNote>

          <HermesCampaignNote>
            <Trans>
              Recording a sender is not permission to use it. The engine reads
              the registered mailbox again at departure and refuses the send
              if it is no longer authorised.
            </Trans>
          </HermesCampaignNote>
        </StyledList>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
