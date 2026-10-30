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
import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { readSenderIdentityAuthorization } from '@/hermes-campaigns-ui/utils/readSenderIdentityAuthorization';

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
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
};

export const HermesSenderIdentitySection = ({
  load,
  selectedIdentityId,
  onSelectIdentity,
  onRetry,
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

          <HermesCampaignNote>
            <Trans>
              The domain, the displayed address, the connection login and the
              mailbox actually delegated are four separate facts. An identity
              on the right domain but without a delegation is refused, and its
              reason is shown next to it.
            </Trans>
          </HermesCampaignNote>
        </StyledList>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
