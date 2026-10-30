import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type ReactNode } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import { type HermesCampaignPermission } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesCampaignEmissionKind } from '@/hermes-campaigns-ui/types/HermesCampaignJourney';

const StyledAction = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledControls = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

type HermesCampaignActionButtonProps = {
  // Stable id, used to tie the button to its own reason text.
  id: string;
  label: string;
  // What pressing this really does, in the product's own terms. Always shown,
  // available or not: a label alone cannot carry the difference between a
  // rendering, a staging emission and a send.
  effect: string;
  emissionKind: HermesCampaignEmissionKind;
  permission: HermesCampaignPermission;
  isRunning: boolean;
  // Absent means the caller has nothing wired for this step, which is itself
  // a reason the control stays shut.
  onActivate?: () => void;
  // A confirmation or a count the caller wants next to the control.
  children?: ReactNode;
};

// One step of the journey. The button names what it really does, and a step
// that is not permitted is shut with its reason in the page rather than in a
// tooltip: `focusableWhenDisabled` keeps the control in the tab order, which
// a plain disabled button is not.
export const HermesCampaignActionButton = ({
  id,
  label,
  effect,
  emissionKind,
  permission,
  isRunning,
  onActivate,
  children,
}: HermesCampaignActionButtonProps) => {
  const { t } = useLingui();

  const reasonId = `${id}-reason`;
  const effectId = `${id}-effect`;

  const isPermitted = permission.kind === 'allowed' && isDefined(onActivate);

  const emissionLabels: Record<HermesCampaignEmissionKind, string> = {
    none: t`Emits nothing`,
    'staging-destinations-only': t`Real emission · staging destinations only`,
    recipients: t`Real emission · to the retained recipients`,
  };

  return (
    <StyledAction>
      <StyledControls>
        <Button
          type="button"
          variant={emissionKind === 'recipients' ? 'solid' : 'outline'}
          size="sm"
          loading={isRunning}
          disabled={!isPermitted}
          // Keeps a refused control in the tab order so its reason is read
          // out instead of being skipped.
          focusableWhenDisabled
          aria-describedby={
            isPermitted ? effectId : `${reasonId} ${effectId}`
          }
          onClick={() => {
            if (isPermitted) {
              onActivate();
            }
          }}
        >
          {label}
        </Button>

        <Tag
          color={emissionKind === 'none' ? 'gray' : 'amber'}
          variant={emissionKind === 'none' ? 'outline' : 'soft'}
          borderStyle="solid"
          truncate={false}
        >
          {emissionLabels[emissionKind]}
        </Tag>

        {children}
      </StyledControls>

      <HermesCampaignNote id={effectId}>{effect}</HermesCampaignNote>

      {permission.kind === 'refused' && (
        <HermesCampaignReason
          id={reasonId}
          reasonCode={permission.reasonCode}
          reason={permission.reason}
          fallback={
            permission.origin === 'sender-identity'
              ? t`Unavailable: the sender identity this would run under is not authorised.`
              : t`Unavailable: the server refused this step without giving a reason.`
          }
        />
      )}

      {permission.kind === 'unknown' && (
        <HermesCampaignNote id={reasonId}>
          {t`Unavailable: the server published no readable answer for this step. The campaign stays a draft.`}
        </HermesCampaignNote>
      )}

      {permission.kind === 'allowed' && !isDefined(onActivate) && (
        <HermesCampaignNote id={reasonId}>
          {t`The server allows this step, but this screen has nothing wired to it yet, so it does nothing.`}
        </HermesCampaignNote>
      )}
    </StyledAction>
  );
};
