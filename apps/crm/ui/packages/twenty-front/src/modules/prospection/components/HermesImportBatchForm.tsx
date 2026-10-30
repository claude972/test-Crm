import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { type ChangeEvent, useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Button, Field, Input, Textarea } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCallFailureNote } from '@/prospection/components/HermesCallFailureNote';
import { HermesIssueList } from '@/prospection/components/HermesIssueList';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import {
  HERMES_MAX_RETAINED_BATCHES,
  HERMES_MAX_ROWS_PER_BATCH,
} from '@/prospection/constants/HermesContractLimits';
import { useHermesCreateImportBatch } from '@/prospection/hooks/useHermesCreateImportBatch';
import { type HermesInputIssue } from '@/prospection/types/HermesInputIssue';
import { validateHermesImportBatchInput } from '@/prospection/utils/validateHermesImportBatchInput';

const StyledForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
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

// A plain file input is not field-aware, so it carries its own label element
// rather than a Field.Label that would associate with nothing.
const StyledFileLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  width: fit-content;
`;

const StyledFileInput = styled.input`
  color: ${themeCssVariables.font.color.secondary};
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  max-width: 100%;
`;

type HermesImportBatchFormProps = {
  // Batches already retained in this workspace, to say when the retention
  // bound is reached. Null when that figure could not be read.
  retainedBatchCount: number | null;
  // Called after a call that answered, so the reception rereads its state.
  onStaged: () => void;
};

export const HermesImportBatchForm = ({
  retainedBatchCount,
  onStaged,
}: HermesImportBatchFormProps) => {
  const { t, i18n } = useLingui();

  const [externalBatchId, setExternalBatchId] = useState('');
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [collectedAtLocal, setCollectedAtLocal] = useState('');
  const [rowsText, setRowsText] = useState('');
  const [submittedIssues, setSubmittedIssues] = useState<HermesInputIssue[]>(
    [],
  );

  const { outcome, stageBatch, resetOutcome } = useHermesCreateImportBatch();

  const validation = useMemo(
    () =>
      validateHermesImportBatchInput({
        externalBatchId,
        name,
        sourceUrl,
        collectedAtLocal,
        rowsText,
      }),
    [externalBatchId, name, sourceUrl, collectedAtLocal, rowsText],
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!isDefined(file)) {
      return;
    }

    // The file only fills the box below: what is sent is always what is on
    // screen.
    setRowsText(await file.text());
  };

  const handleSubmit = () => {
    resetOutcome();

    if (validation.input === null) {
      setSubmittedIssues(validation.issues);
      return;
    }

    setSubmittedIssues([]);
    void stageBatch(validation.input).then(onStaged);
  };

  const isRunning = outcome.kind === 'running';

  return (
    <Section.Root>
      <Section.Header
        title={t`Batch to deposit`}
        description={t`JSON rows, ${HERMES_MAX_ROWS_PER_BATCH} per batch at most. A row that fails validation is still staged, with its error.`}
      />

      <StyledForm
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <StyledFields>
          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Batch name`}</Field.Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t`Paris trade show, October`}
            />
          </Field.Root>

          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Batch id`}</Field.Label>
            <Input
              value={externalBatchId}
              onChange={(event) => setExternalBatchId(event.target.value)}
              placeholder={t`your-own-reference`}
            />
            <Field.Description>
              {t`The same id with the same content stages nothing twice.`}
            </Field.Description>
          </Field.Root>

          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Source URL`}</Field.Label>
            <Input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.org/directory"
            />
            <Field.Description>
              {t`http or https, without credentials.`}
            </Field.Description>
          </Field.Root>

          <Field.Root render={<StyledField />}>
            <Field.Label>{t`Collected on`}</Field.Label>
            <Input
              type="datetime-local"
              value={collectedAtLocal}
              onChange={(event) => setCollectedAtLocal(event.target.value)}
            />
            <Field.Description>
              {/* What leaves the browser, shown as it is sent. */}
              {isDefined(validation.collectedAt)
                ? t`Sent as ${validation.collectedAt}`
                : t`Sent as an ISO 8601 instant.`}
            </Field.Description>
          </Field.Root>
        </StyledFields>

        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Rows`}</Field.Label>
          <Textarea
            value={rowsText}
            onChange={(event) => setRowsText(event.target.value)}
            rows={6}
            placeholder={`[{"email": "contact@example.org", "companyName": "Example"}]`}
          />
          <Field.Description>
            {t`Accepted fields: email, companyName, firstName, lastName, jobTitle, website, phone.`}
          </Field.Description>
        </Field.Root>

        <StyledFileLabel>
          <span>{t`Or load a JSON file`}</span>
          <StyledFileInput
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleFileChange(event)}
          />
        </StyledFileLabel>

        <HermesIssueList issues={submittedIssues} />

        {isDefined(validation.rowCount) && (
          <ProspectionNote>
            {t`${i18n.number(validation.rowCount)} rows read.`}
          </ProspectionNote>
        )}

        {isDefined(retainedBatchCount) &&
          retainedBatchCount >= HERMES_MAX_RETAINED_BATCHES && (
            <ProspectionNote>
              {t`Retention bound reached: ${HERMES_MAX_RETAINED_BATCHES} batches are kept per workspace.`}
            </ProspectionNote>
          )}

        <StyledActions>
          <Button type="submit" variant="solid" size="sm" loading={isRunning}>
            {t`Stage batch`}
          </Button>
        </StyledActions>

        {outcome.kind === 'read' && (
          <>
            <ProspectionNote>
              {outcome.result.replay === true ? (
                <Trans>Already staged: same batch id and same content.</Trans>
              ) : outcome.result.replay === false ? (
                <Trans>Batch staged.</Trans>
              ) : (
                <Trans>Batch staged. Replay status unknown.</Trans>
              )}
            </ProspectionNote>
            {outcome.result.batch === null && (
              <ProspectionNote role="alert">
                <Trans>The staged batch could not be read back.</Trans>
              </ProspectionNote>
            )}
          </>
        )}

        {outcome.kind === 'unreadable' && (
          <HermesPayloadProblemNote
            problem={outcome.problem}
            subject={t`Staging answer`}
          />
        )}

        {outcome.kind === 'failed' && (
          <HermesCallFailureNote
            failure={outcome.failure}
            fallbackMessage={t`Batch refused.`}
          />
        )}
      </StyledForm>
    </Section.Root>
  );
};
