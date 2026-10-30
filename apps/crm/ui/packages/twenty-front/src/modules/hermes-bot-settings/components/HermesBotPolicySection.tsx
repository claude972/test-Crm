import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesBotPolicyRow } from '@/hermes-bot-settings/components/HermesBotPolicyRow';
import { HermesBotSettingsNote } from '@/hermes-bot-settings/components/HermesBotSettingsNote';
import {
  useHermesWorkspaceBotPolicies,
  type HermesBotPolicyWriteState,
} from '@/hermes-bot-settings/hooks/useHermesWorkspaceBotPolicies';
import {
  HERMES_BOT_POLICY_SCOPES,
  type HermesBotPolicy,
  type HermesBotPolicyScope,
} from '@/hermes-bot-settings/types/HermesBotPolicy';

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

// The published scopes in the order they are read in: the company first,
// then the channels it covers.
const SCOPE_ORDER: readonly HermesBotPolicyScope[] = HERMES_BOT_POLICY_SCOPES;

// Who may reply, for the whole company and for each channel.
//
// The three modes, in the product's own terms:
// - Automatic  the bot may reply on its own.
// - Draft only the bot prepares a draft; nothing leaves without a human click.
// - Off        no draft and no call to the bot. Messages still arrive and a
//              human can still reply.
//
// Nothing on this screen is shown as a mode unless the server reported it. A
// read that failed says so and offers no setting in its place, because a
// default shown here would read as the company's actual policy.
export const HermesBotPolicySection = () => {
  const { t } = useLingui();

  const { read, writeState, setMode } = useHermesWorkspaceBotPolicies();

  const scopeLabels: Record<HermesBotPolicyScope, string> = {
    WORKSPACE: t`Whole company`,
    WHATSAPP: t`WhatsApp`,
    EMAIL: t`Email`,
  };

  // The write state belongs to one scope at a time, so each row is handed its
  // own state and never another row's.
  const writeStateForScope = (
    scope: HermesBotPolicyScope,
  ): HermesBotPolicyWriteState =>
    writeState.kind !== 'idle' && writeState.scope === scope
      ? writeState
      : { kind: 'idle' };

  // Only what the server reported, in the published order. A scope that is
  // absent from the answer is not rendered: inventing a row for it would show
  // a policy nobody stated.
  const knownRows: { scope: HermesBotPolicyScope; policy: HermesBotPolicy }[] =
    read.kind === 'reported'
      ? SCOPE_ORDER.flatMap((scope) =>
          read.policies
            .filter((policy) => policy.scope === scope)
            .map((policy) => ({ scope, policy })),
        )
      : [];

  // A scope this client does not know is kept and shown verbatim, without
  // controls: the three modes have a defined meaning for the published scopes
  // only, and offering them here would be a guess about what is being changed.
  const unknownPolicies: HermesBotPolicy[] =
    read.kind === 'reported'
      ? read.policies.filter((policy) => policy.scope === null)
      : [];

  return (
    <Section.Root>
      <Section.Header
        title={t`Bot replies`}
        description={t`Choose who answers: the bot on its own, the bot as a drafter with a human sending, or humans only. Each channel can be stricter than the company setting.`}
      />

      {read.kind === 'loading' && (
        <HermesBotSettingsNote role="status">
          {t`Loading…`}
        </HermesBotSettingsNote>
      )}

      {/* A failed read is unknown, not permissive. No mode is displayed in its
          place and no change can be sent, because a change needs the revision
          that this read did not bring back. */}
      {read.kind === 'unknown' && (
        <HermesBotSettingsNote role="alert">
          {t`The bot policy could not be read, so it is unknown. Reload to try again.`}
        </HermesBotSettingsNote>
      )}

      {read.kind === 'reported' && (
        <StyledRows>
          {knownRows.map(({ scope, policy }) => (
            <HermesBotPolicyRow
              key={scope}
              label={scopeLabels[scope]}
              policy={policy}
              writeState={writeStateForScope(scope)}
              onSelectMode={(mode) => setMode(scope, mode)}
            />
          ))}
        </StyledRows>
      )}

      {read.kind === 'reported' && knownRows.length === 0 && (
        <HermesBotSettingsNote role="status">
          {t`The server reported no bot policy for this company.`}
        </HermesBotSettingsNote>
      )}

      {unknownPolicies.map((policy) => (
        <HermesBotSettingsNote
          key={policy.unknownScope ?? ''}
          role="status"
        >
          {isNonEmptyString(policy.unknownScope)
            ? t`Scope not recognised: ${policy.unknownScope}. It is left untouched.`
            : t`A scope was reported without a name. It is left untouched.`}
        </HermesBotSettingsNote>
      ))}

      {read.kind === 'reported' && read.unreadableEntryCount > 0 && (
        <HermesBotSettingsNote role="status">
          {t`Entries left out because they could not be read: ${read.unreadableEntryCount}`}
        </HermesBotSettingsNote>
      )}
    </Section.Root>
  );
};
