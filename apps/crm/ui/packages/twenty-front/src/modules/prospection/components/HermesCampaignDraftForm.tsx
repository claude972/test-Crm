import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button, Field, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HERMES_CAMPAIGN_RUNTIME_PATH } from '@/hermes-shell/constants/HermesRuntimeRoutePaths';
import { HermesCallFailureNote } from '@/prospection/components/HermesCallFailureNote';
import { HermesIssueList } from '@/prospection/components/HermesIssueList';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import { HERMES_MAX_DRAFT_ROW_IDS } from '@/prospection/constants/HermesContractLimits';
import { useHermesCreateCampaignDraft } from '@/prospection/hooks/useHermesCreateCampaignDraft';
import { type HermesInputIssue } from '@/prospection/types/HermesInputIssue';
import { validateHermesCampaignDraftInput } from '@/prospection/utils/validateHermesQualificationInput';

const StyledForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledEditorLink = styled(Link)`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  text-decoration: none;
  width: fit-content;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledOutcome = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

type HermesCampaignDraftFormProps = {
  // Already restricted to qualified rows: the contract makes only qualified,
  // unsuppressed recipients eligible.
  eligibleRowIds: string[];
};

// Creates a draft campaign, its audience list and its members, and nothing
// else. There is no send control here, and none exists in this module: the
// contract returns sendingAvailable false and performs no send.
export const HermesCampaignDraftForm = ({
  eligibleRowIds,
}: HermesCampaignDraftFormProps) => {
  const { t, i18n } = useLingui();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [submittedIssues, setSubmittedIssues] = useState<HermesInputIssue[]>(
    [],
  );

  const { outcome, createDraft, resetOutcome } = useHermesCreateCampaignDraft();

  const validation = useMemo(
    () =>
      validateHermesCampaignDraftInput({
        name,
        subject,
        rowIds: eligibleRowIds,
      }),
    [name, subject, eligibleRowIds],
  );

  const handleSubmit = () => {
    resetOutcome();

    if (validation.input === null) {
      setSubmittedIssues(validation.issues);
      return;
    }

    setSubmittedIssues([]);
    void createDraft(validation.input);
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Draft a campaign`}
        description={t`${i18n.number(eligibleRowIds.length)} qualified rows selected, ${i18n.number(HERMES_MAX_DRAFT_ROW_IDS)} at most. Nothing is sent.`}
      />

      <StyledForm
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <StyledFields>
          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Campaign name`}</Field.Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t`October outreach`}
            />
          </Field.Root>

          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Subject`}</Field.Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t`Subject line`}
            />
          </Field.Root>
        </StyledFields>

        <HermesIssueList issues={submittedIssues} />

        <StyledActions>
          <Button
            type="submit"
            variant="solid"
            size="sm"
            loading={outcome.kind === 'running'}
          >
            {t`Create draft`}
          </Button>
        </StyledActions>

        {outcome.kind === 'read' && (
          <StyledOutcome>
            <ProspectionNote>
              {outcome.result.status === 'DRAFT' ? (
                <Trans>Draft created. Nothing was sent.</Trans>
              ) : (
                <Trans>
                  The campaign answered with an unknown status. Open it before
                  doing anything with it.
                </Trans>
              )}
            </ProspectionNote>

            {/* The flag as returned. Neither value, nor its absence, ever
                turns into a send control. */}
            <Tag
              color="gray"
              variant="outline"
              borderStyle={
                outcome.result.sendingAvailable === false ? 'solid' : 'dashed'
              }
              truncate={false}
            >
              {outcome.result.sendingAvailable === false
                ? t`Sending unavailable`
                : t`Sending flag unknown`}
            </Tag>

            <ProspectionNote>
              <Trans>
                A draft is not a finished campaign: its content and any
                first-contact notice are still to be written in the campaign
                editor.
              </Trans>
            </ProspectionNote>

            {/* Without this the screen named the editor and offered no way in.
                The link appears only with an identifier the server returned. */}
            {isNonEmptyString(outcome.result.campaignId) ? (
              <StyledEditorLink
                to={HERMES_CAMPAIGN_RUNTIME_PATH.replace(
                  ':campaignId',
                  outcome.result.campaignId,
                )}
              >
                {t`Open the campaign editor`}
              </StyledEditorLink>
            ) : (
              <ProspectionNote>
                <Trans>
                  The answer carried no campaign identifier, so this screen
                  cannot open the editor for it. Find it in the campaign list.
                </Trans>
              </ProspectionNote>
            )}
          </StyledOutcome>
        )}

        {outcome.kind === 'unreadable' && (
          <HermesPayloadProblemNote
            problem={outcome.problem}
            subject={t`Draft answer`}
          />
        )}

        {outcome.kind === 'failed' && (
          <HermesCallFailureNote
            failure={outcome.failure}
            fallbackMessage={t`Draft refused.`}
          />
        )}
      </StyledForm>
    </Section.Root>
  );
};
