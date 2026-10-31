import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconAlertTriangle, IconCheck, IconDeviceFloppy } from 'kovaa-lab-ui/icon';
import { Banner, Loader } from 'kovaa-lab-ui/primitives/feedback';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import { type HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

// A div rather than a span: it can contain the loader, which renders a div.
const StyledStatus = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  overflow-wrap: anywhere;
`;

type HermesCampaignSaveControlProps = {
  // Stable id, so the button and the sentence explaining its state are tied
  // together for a screen reader.
  id: string;
  label: string;
  saveState: HermesCampaignSaveState;
  // Absent means nothing is wired to record this, which keeps the control
  // shut with that said out loud rather than offering a button that lies.
  onSave?: () => void;
  // Client-side checks that must pass before anything is recorded. Recording
  // a subject that is too long only to have the server refuse it is a worse
  // experience than refusing it here, with the reason already on screen.
  canSave: boolean;
  // Why `canSave` is false, when the caller knows.
  blockedReason?: string;
};

// The control that records what is on screen, with its own state said in
// words next to it.
//
// Six states, not two. `saved` and `unsaved` are the pair that matters: a
// draft that was never recorded must never look like a recorded one. And an
// uncertain outcome is neither — it offers no retry, because a second
// attempt after an unknown result is how an edit gets lost or written twice.
export const HermesCampaignSaveControl = ({
  id,
  label,
  saveState,
  onSave,
  canSave,
  blockedReason,
}: HermesCampaignSaveControlProps) => {
  const { t } = useLingui();

  const statusId = `${id}-status`;
  const isSaving = saveState.kind === 'saving';
  const isWired = isDefined(onSave);
  const isPressable = isWired && canSave && !isSaving;

  return (
    <StyledLayout>
      <StyledRow>
        <Button
          id={id}
          aria-describedby={statusId}
          variant="outline"
          startIcon={<IconDeviceFloppy />}
          disabled={!isPressable}
          // Keeps the control in the tab order while it is shut, so its
          // reason is reachable with a keyboard instead of disappearing with
          // the button.
          focusableWhenDisabled
          onClick={() => {
            if (isPressable) {
              onSave();
            }
          }}
        >
          {label}
        </Button>

        <StyledStatus id={statusId} aria-live="polite">
          {isSaving && (
            <>
              <Loader />
              {t`Recording…`}
            </>
          )}
          {saveState.kind === 'saved' && (
            <>
              <IconCheck aria-hidden="true" />
              {t`Recorded on the campaign. It will still be here after a reload.`}
            </>
          )}
          {saveState.kind === 'unsaved' && (
            <>
              <IconAlertTriangle aria-hidden="true" />
              {t`Not recorded yet: what is on screen differs from what the server holds.`}
            </>
          )}
          {saveState.kind === 'idle' && t`Nothing to record.`}
        </StyledStatus>
      </StyledRow>

      {!canSave && isDefined(blockedReason) && (
        <HermesCampaignNote id={`${id}-blocked`}>
          {blockedReason}
        </HermesCampaignNote>
      )}

      {isWired === false && (
        <HermesCampaignNote>
          {t`This screen has nothing wired to record this, so the control does nothing.`}
        </HermesCampaignNote>
      )}

      {saveState.kind === 'failed' && (
        <>
          <Banner
            role="alert"
            status="error"
            variant="soft"
            icon={<IconAlertTriangle aria-hidden="true" />}
          >
            {t`The server refused to record this. Nothing was saved.`}
          </Banner>
          <HermesCampaignReason
            reasonCode={saveState.reasonCode}
            reason={saveState.reason}
            fallback={t`The server gave no reason.`}
          />
        </>
      )}

      {saveState.kind === 'unconfirmed' && (
        <>
          <Banner
            role="alert"
            status="warning"
            variant="soft"
            icon={<IconAlertTriangle aria-hidden="true" />}
          >
            {t`The outcome of this recording is not known.`}
          </Banner>
          <HermesCampaignReason
            reasonCode={saveState.reasonCode}
            reason={saveState.reason}
            fallback={t`The server gave no reason.`}
          />
          <HermesCampaignNote>
            {t`It may or may not have been recorded. Reload the campaign to see what the server holds before editing again — nothing is retried on its own, on purpose.`}
          </HermesCampaignNote>
        </>
      )}
    </StyledLayout>
  );
};
