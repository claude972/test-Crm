import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import {
  IconCheck,
  IconCircleOff,
  IconHelpCircle,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import {
  type HermesCampaignCapabilities,
  type HermesCampaignCapabilityName,
  type HermesCampaignPermission,
} from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesSenderIdentityAuthorization } from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';
import { readCampaignCapability } from '@/hermes-campaigns-ui/utils/readCampaignCapability';

const StyledList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledRow = styled.div`
  align-items: start;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 0;
`;

const StyledRowBody = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-column: 1 / -1;
  min-width: 0;
`;

const CAPABILITY_ORDER: readonly HermesCampaignCapabilityName[] = [
  'preview',
  'testSynthetic',
  'schedule',
  'send',
  'cancel',
];

// Available, refused and unknown each get their own word, icon and border.
// None of them is told by colour alone.
const PERMISSION_PRESENTATION: Record<
  HermesCampaignPermission['kind'],
  {
    Icon: IconComponent;
    color: 'jade' | 'red' | 'gray';
    variant: 'soft' | 'outline';
    borderStyle: 'solid' | 'dashed';
  }
> = {
  allowed: {
    Icon: IconCheck,
    color: 'jade',
    variant: 'soft',
    borderStyle: 'solid',
  },
  refused: {
    Icon: IconCircleOff,
    color: 'red',
    variant: 'soft',
    borderStyle: 'solid',
  },
  unknown: {
    Icon: IconHelpCircle,
    color: 'gray',
    variant: 'outline',
    borderStyle: 'dashed',
  },
};

type HermesCampaignCapabilitiesSectionProps = {
  load: HermesCampaignLoad<HermesCampaignCapabilities>;
  // The verdict on the chosen identity. Null while none is chosen, which
  // leaves every emitting capability unknown rather than available.
  identityAuthorization: HermesSenderIdentityAuthorization | null;
  onRetry?: () => void;
};

// The five capabilities as the server computed them. This section never
// computes one: it reads what was published, and anything it cannot read
// stays unavailable with its reason on screen.
export const HermesCampaignCapabilitiesSection = ({
  load,
  identityAuthorization,
  onRetry,
}: HermesCampaignCapabilitiesSectionProps) => {
  const { t, i18n } = useLingui();

  const capabilities = load.kind === 'ready' ? load.value : null;

  const checkedAt = capabilities?.checkedAt?.trim();
  const checkedAtDate = isNonEmptyString(checkedAt)
    ? new Date(checkedAt)
    : null;
  const checkedAtLabel =
    isDefined(checkedAtDate) && !Number.isNaN(checkedAtDate.getTime())
      ? t`Computed by the server on ${i18n.date(checkedAtDate, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : t`Computed by the server. When, it did not say.`;

  const names: Record<HermesCampaignCapabilityName, string> = {
    preview: t`Preview`,
    testSynthetic: t`Synthetic test`,
    schedule: t`Scheduling`,
    send: t`Send`,
    cancel: t`Cancellation`,
  };

  const explanations: Record<HermesCampaignCapabilityName, string> = {
    preview: t`Renders the content for one recipient. Emits nothing: no transport is contacted.`,
    testSynthetic: t`One real message goes to the address you type. The server applies no staging restriction to it, so the destination is yours to answer for.`,
    schedule: t`Records a moment. Scheduling does not send: the authorisation and the exclusions are read again at departure.`,
    send: t`Puts the campaign on the transport for the retained recipients.`,
    cancel: t`Withdraws the departures that are still avoidable. It cannot recall a message the SMTP server already accepted.`,
  };

  return (
    <Section.Root>
      <Section.Header title={t`Capabilities`} description={checkedAtLabel} />

      <HermesCampaignLoadView
        load={load}
        emptyTitle={t`No capability published`}
        emptyDescription={t`The server returned no capability for this campaign, so none is available.`}
        notConfiguredTitle={t`Capabilities not computed yet`}
        notConfiguredDescription={t`Capabilities are computed once the mailbox, the licence, the rights and the quota have been checked. Until then the campaign stays a draft.`}
        failedTitle={t`Capabilities could not be read`}
        onRetry={onRetry}
      >
        <StyledList>
          {CAPABILITY_ORDER.map((name) => {
            const permission = readCampaignCapability({
              name,
              capability: capabilities?.[name] ?? null,
              identityAuthorization,
            });
            const { Icon, color, variant, borderStyle } =
              PERMISSION_PRESENTATION[permission.kind];

            return (
              <StyledRow key={name}>
                <StyledName>{names[name]}</StyledName>
                <Tag
                  color={color}
                  variant={variant}
                  borderStyle={borderStyle}
                  startIcon={<Icon />}
                  truncate={false}
                >
                  {permission.kind === 'allowed'
                    ? t`Available`
                    : permission.kind === 'refused'
                      ? t`Unavailable`
                      : t`Unknown`}
                </Tag>

                <StyledRowBody>
                  {/* Shown available or not: a person has to know what they
                      are being refused. */}
                  <HermesCampaignNote>{explanations[name]}</HermesCampaignNote>

                  {permission.kind === 'refused' && (
                    <HermesCampaignReason
                      reasonCode={permission.reasonCode}
                      reason={permission.reason}
                      fallback={
                        permission.origin === 'sender-identity'
                          ? t`Refused because the sender identity this would run under is not authorised.`
                          : permission.origin === 'client'
                            ? t`Not available in this version: no operation is published yet to carry out this capability. The server was not asked.`
                            : t`The server refused this capability without giving a reason.`
                      }
                    />
                  )}

                  {permission.kind === 'unknown' && (
                    <HermesCampaignNote>
                      {t`The server published no readable answer for this capability. Unverified means unavailable, so the control stays shut.`}
                    </HermesCampaignNote>
                  )}
                </StyledRowBody>
              </StyledRow>
            );
          })}

          <HermesCampaignNote>
            <Trans>
              An interface boolean authorises nothing. None of these states is
              deduced from a pilot name, a feature flag or a label: each one is
              what the server answered, and an unreadable answer leaves the
              capability unavailable.
            </Trans>
          </HermesCampaignNote>
        </StyledList>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
