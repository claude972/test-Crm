import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesBotPolicyModeTag } from '@/hermes-bot-settings/components/HermesBotPolicyModeTag';
import { HermesBotSettingsNote } from '@/hermes-bot-settings/components/HermesBotSettingsNote';
import { type HermesBotPolicyWriteState } from '@/hermes-bot-settings/hooks/useHermesWorkspaceBotPolicies';
import {
  HERMES_BOT_POLICY_WRITE_MODES,
  type HermesBotPolicy,
  type HermesBotPolicyWriteMode,
} from '@/hermes-bot-settings/types/HermesBotPolicy';

const StyledRow = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledControls = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesBotPolicyRowProps = {
  label: string;
  policy: HermesBotPolicy;
  // The write state of this row only. The parent narrows it by scope so one
  // row's progress or refusal never shows up on another.
  writeState: HermesBotPolicyWriteState;
  onSelectMode: (mode: HermesBotPolicyWriteMode) => void;
};

// One scope: the company as a whole, or one channel.
//
// The buttons ask; they do not decide. The tag always shows what the server
// last reported, never the button that was pressed, and a request that the
// server refused leaves the tag where it was.
export const HermesBotPolicyRow = ({
  label,
  policy,
  writeState,
  onSelectMode,
}: HermesBotPolicyRowProps) => {
  const { t } = useLingui();

  const isRequesting = writeState.kind === 'requesting';

  const modeLabels: Record<HermesBotPolicyWriteMode, string> = {
    AUTO: t`Automatic`,
    ASSISTED: t`Draft only`,
    OFF: t`Off`,
  };

  return (
    <StyledRow>
      <StyledHeader>
        <StyledLabel>{label}</StyledLabel>

        <HermesBotPolicyModeTag policy={policy} />
      </StyledHeader>

      <StyledControls role="group" aria-label={label}>
        {HERMES_BOT_POLICY_WRITE_MODES.map((mode) => (
          <Button
            key={mode}
            variant="outline"
            size="sm"
            loading={isRequesting}
            // The mode the server reported is the one already in force, so
            // asking for it again would be a write with nothing to change.
            disabled={policy.mode === mode}
            aria-pressed={policy.mode === mode}
            onClick={() => onSelectMode(mode)}
          >
            {modeLabels[mode]}
          </Button>
        ))}
      </StyledControls>

      {writeState.kind === 'saved' && (
        <HermesBotSettingsNote role="status">
          {isNonEmptyString(writeState.mode)
            ? t`Saved. The server applied: ${writeState.mode}`
            : t`Saved.`}
        </HermesBotSettingsNote>
      )}

      {writeState.kind === 'unconfirmed' && (
        <HermesBotSettingsNote role="alert">
          {t`The server's answer could not be read, so this change is unconfirmed. Reload to see what it kept.`}
        </HermesBotSettingsNote>
      )}

      {/* Nothing left the browser in this case, and the note says exactly
          that: a write without the revision that was read cannot be refused
          for staleness, so it is not attempted at all. */}
      {writeState.kind === 'not-sent' && (
        <HermesBotSettingsNote role="alert">
          {t`Nothing was sent: this policy was read without its revision, and a change without one could overwrite someone else's decision. Reload and try again.`}
        </HermesBotSettingsNote>
      )}

      {writeState.kind === 'refused' && (
        <HermesBotSettingsNote role="alert">
          {writeState.reason === 'denied'
            ? t`Not authorised to change this policy.`
            : writeState.reason === 'stale'
              ? t`Someone changed this policy first, so nothing was written. Reload and try again.`
              : writeState.reason === 'restricted'
                ? t`A channel cannot allow more than the company setting, so nothing was written.`
                : isNonEmptyString(writeState.message)
                  ? t`Policy unchanged: ${writeState.message}`
                  : t`Policy unchanged.`}
        </HermesBotSettingsNote>
      )}
    </StyledRow>
  );
};
