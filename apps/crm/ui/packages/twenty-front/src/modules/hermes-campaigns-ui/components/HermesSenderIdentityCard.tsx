import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleOff,
  IconHelpCircle,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';
import { Radio } from 'kovaa-lab-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { readSenderIdentitySelectability } from '@/hermes-campaigns-ui/utils/readSenderIdentitySelectability';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import {
  type HermesSenderIdentity,
  type HermesSenderIdentityState,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import {
  type HermesSenderIdentityAuthorization,
  type HermesSenderIdentityRefusalCode,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';

const StyledCard = styled.article`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};

  &[data-selected='true'] {
    border-color: ${themeCssVariables.border.color.strong};
  }

  &[data-authorized='false'] {
    background: ${themeCssVariables.background.transparent.lighter};
  }
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledFacts = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(8rem, auto) minmax(0, 1fr);
  margin: 0;
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
`;

const StyledTerm = styled.dt`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDescription = styled.dd`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0 0 ${themeCssVariables.spacing[1]} 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

type StatePresentation = {
  color: TagColor;
  variant: NonNullable<TagProps['variant']>;
  borderStyle: NonNullable<TagProps['borderStyle']>;
  Icon: IconComponent;
};

// One icon and one word per state, so none of the four reads like another in
// greyscale. A dashed border only paints under variant="outline".
const STATE_PRESENTATION: Record<HermesSenderIdentityState, StatePresentation> =
  {
    verified: {
      color: 'jade',
      variant: 'soft',
      borderStyle: 'solid',
      Icon: IconCheck,
    },
    unverified: {
      color: 'amber',
      variant: 'soft',
      borderStyle: 'solid',
      Icon: IconAlertTriangle,
    },
    revoked: {
      color: 'red',
      variant: 'soft',
      borderStyle: 'solid',
      Icon: IconCircleOff,
    },
  };

const UNKNOWN_STATE_PRESENTATION: StatePresentation = {
  color: 'gray',
  variant: 'outline',
  borderStyle: 'dashed',
  Icon: IconHelpCircle,
};

type HermesSenderIdentityCardProps = {
  identity: HermesSenderIdentity;
  authorization: HermesSenderIdentityAuthorization;
  isSelected: boolean;
};

// One identity, with the domain, the displayed address, the connection login
// and the mailbox actually delegated kept visibly apart. The radio is the only
// control; a refused identity cannot be chosen and carries its reason.
export const HermesSenderIdentityCard = ({
  identity,
  authorization,
  isSelected,
}: HermesSenderIdentityCardProps) => {
  const { t, i18n } = useLingui();

  const selectability = readSenderIdentitySelectability(identity);

  const detailsId = `hermes-sender-identity-${identity.id}-details`;
  const refusalId = `hermes-sender-identity-${identity.id}-refusal`;

  const displayedAddress = identity.displayedAddress?.trim();
  const addressLabel = isNonEmptyString(displayedAddress)
    ? displayedAddress
    : t`No displayed address`;

  const mailbox = identity.delegatedMailbox;

  const stateLabels: Record<HermesSenderIdentityState, string> = {
    verified: t`Verified`,
    unverified: t`Not verified`,
    revoked: t`Revoked`,
  };

  const stateMeanings: Record<HermesSenderIdentityState, string> = {
    verified: t`Delegation attested on this exact mailbox.`,
    unverified: t`No attested delegation yet. Not available for an emission.`,
    revoked: t`The delegation was withdrawn. Not available for an emission.`,
  };

  const refusalSentences: Record<HermesSenderIdentityRefusalCode, string> = {
    SERVER_VERDICT_MISSING: t`The server published no verdict for this identity. An unverified right is an unavailable right.`,
    SERVER_VERDICT_UNREADABLE: t`The server's verdict for this identity could not be read, so nothing is concluded from it.`,
    SERVER_REFUSED: t`The server refused this identity.`,
    IDENTITY_STATE_UNKNOWN: t`The published state is outside the contract, so it grants nothing.`,
    IDENTITY_REVOKED: t`The delegation on this mailbox was withdrawn.`,
    IDENTITY_NOT_VERIFIED: t`This identity has no attested delegation yet.`,
    MAILBOX_NOT_DELEGATED: t`Right domain, but this mailbox is not delegated. A domain is not a mailbox.`,
    MAILBOX_DELEGATION_UNKNOWN: t`Whether this mailbox is delegated could not be read, which is not a delegation.`,
    DISPLAYED_ADDRESS_MISSING: t`This identity carries no displayed address.`,
    DISPLAYED_ADDRESS_NOT_AUTHORIZED: t`The displayed address is neither the delegated mailbox nor one of its explicitly authorised aliases.`,
    REPLY_TO_NOT_AUTHORIZED: t`The reply address is outside the delegated mailbox and its authorised aliases.`,
  };

  const {
    color: stateColor,
    variant: stateVariant,
    borderStyle: stateBorderStyle,
    Icon: StateIcon,
  } = isDefined(identity.state)
    ? STATE_PRESENTATION[identity.state]
    : UNKNOWN_STATE_PRESENTATION;

  const unknownState = identity.unknownState?.trim();
  const stateLabel = isDefined(identity.state)
    ? stateLabels[identity.state]
    : isNonEmptyString(unknownState)
      ? t`Unknown state: ${unknownState}`
      : t`Unknown state`;

  // The label and the exact address, both when both were published: the label
  // is how a person recognises the mailbox, the address is what the
  // delegation was granted on.
  const mailboxLabel = isDefined(mailbox)
    ? [mailbox.label?.trim(), mailbox.address?.trim()]
        .filter((part): part is string => isNonEmptyString(part))
        .join(' · ')
    : '';

  const attestedAt = mailbox?.attestedAt?.trim();
  const attestedAtDate = isNonEmptyString(attestedAt)
    ? new Date(attestedAt)
    : null;
  // An unparsable date is unknown, never shown as today.
  const attestedAtLabel =
    isDefined(attestedAtDate) && !Number.isNaN(attestedAtDate.getTime())
      ? i18n.date(attestedAtDate, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : t`Unknown`;

  const delegationLabel = !isDefined(mailbox)
    ? t`No mailbox published`
    : mailbox.delegated === true
      ? t`Delegated`
      : mailbox.delegated === false
        ? t`Not delegated`
        : t`Delegation unknown`;

  const DelegationIcon =
    mailbox?.delegated === true
      ? IconCheck
      : mailbox?.delegated === false
        ? IconCircleOff
        : IconHelpCircle;

  return (
    <StyledCard
      data-selected={isSelected ? 'true' : 'false'}
      data-authorized={authorization.allowed ? 'true' : 'false'}
    >
      <StyledHeader>
        {/* The reason sits in the card rather than on the control, which is
            unreachable once disabled. */}
        {/* Choosing a sender records it on the campaign; it emits nothing.
            So the control is shut only when there is no address to record,
            never because the identity may not emit — that refusal belongs to
            the emitting steps, which still enforce it. Disabling it here was
            why a draft with no sender could never be given one. */}
        <Radio
          value={identity.id}
          disabled={!selectability.selectable}
          aria-describedby={
            authorization.allowed ? detailsId : `${refusalId} ${detailsId}`
          }
        >
          {addressLabel}
        </Radio>

        <Tag
          color={stateColor}
          variant={stateVariant}
          borderStyle={stateBorderStyle}
          startIcon={<StateIcon />}
          truncate={false}
          title={
            isDefined(identity.state)
              ? stateMeanings[identity.state]
              : t`The published state is outside the contract, so it grants nothing.`
          }
        >
          {stateLabel}
        </Tag>

        <Tag
          color={mailbox?.delegated === true ? 'jade' : 'gray'}
          variant={mailbox?.delegated === true ? 'soft' : 'outline'}
          borderStyle={mailbox?.delegated === true ? 'solid' : 'dashed'}
          startIcon={<DelegationIcon />}
          truncate={false}
        >
          {delegationLabel}
        </Tag>

        {isSelected && (
          <Tag
            color="gray"
            variant="outline"
            borderStyle="solid"
            truncate={false}
          >
            {t`Selected`}
          </Tag>
        )}
      </StyledHeader>

      {authorization.allowed === false && (
        <StyledHeader id={refusalId}>
          <Tag
            color="red"
            variant="soft"
            borderStyle="solid"
            startIcon={<IconCircleOff />}
            truncate={false}
          >
            {t`Refused`}
          </Tag>
          <HermesCampaignReason
            reasonCode={authorization.serverReasonCode ?? authorization.code}
            reason={authorization.serverReason}
            fallback={refusalSentences[authorization.code]}
          />
        </StyledHeader>
      )}

      {/* The distinction that was missing: this refusal is about emitting,
          not about choosing. The mailbox can still be recorded on the
          campaign, and the server is asked again about the address that was
          actually stored. */}
      {authorization.allowed === false && selectability.selectable && (
        <HermesCampaignNote>
          {t`Refused for sending, not for choosing: this mailbox can still be recorded on the campaign, and the server is asked again about the address it actually holds.`}
        </HermesCampaignNote>
      )}

      {!selectability.selectable && (
        <HermesCampaignNote>
          {t`This identity cannot be recorded: the server published no address for it, so there is nothing to store as the sender.`}
        </HermesCampaignNote>
      )}

      <StyledFacts id={detailsId}>
        <StyledTerm>{t`Domain`}</StyledTerm>
        <StyledDescription>
          {isNonEmptyString(identity.domain?.trim())
            ? identity.domain
            : t`Not published`}
        </StyledDescription>

        <StyledTerm>{t`Delegated mailbox`}</StyledTerm>
        <StyledDescription>
          {isNonEmptyString(mailboxLabel) ? mailboxLabel : t`Not published`}
        </StyledDescription>

        <StyledTerm>{t`Connection login`}</StyledTerm>
        <StyledDescription>
          {isNonEmptyString(identity.connectionLogin?.trim())
            ? identity.connectionLogin
            : t`Not published`}
        </StyledDescription>

        <StyledTerm>{t`Authorised aliases`}</StyledTerm>
        <StyledDescription>
          {identity.authorizedAliases.length > 0
            ? identity.authorizedAliases.join(', ')
            : t`None. An address outside this list is refused even inside the right domain.`}
        </StyledDescription>

        <StyledTerm>{t`Reply address`}</StyledTerm>
        <StyledDescription>
          {isNonEmptyString(identity.replyToAddress?.trim())
            ? identity.replyToAddress
            : t`None published. Replies then reach the displayed address.`}
        </StyledDescription>

        <StyledTerm>{t`Delegation attested`}</StyledTerm>
        <StyledDescription>{attestedAtLabel}</StyledDescription>
      </StyledFacts>

      {isNonEmptyString(mailbox?.proof?.trim()) && (
        <HermesCampaignNote>{mailbox?.proof}</HermesCampaignNote>
      )}
    </StyledCard>
  );
};
