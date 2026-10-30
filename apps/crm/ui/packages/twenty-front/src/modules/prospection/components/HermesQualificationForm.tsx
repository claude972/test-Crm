import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Section } from 'kovaa-lab-ui/components/layout';
import {
  Button,
  Field,
  Input,
  Radio,
  RadioGroup,
  Textarea,
} from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCallFailureNote } from '@/prospection/components/HermesCallFailureNote';
import { HermesIssueList } from '@/prospection/components/HermesIssueList';
import { HermesPayloadProblemNote } from '@/prospection/components/HermesPayloadProblemNote';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';
import {
  HERMES_MAX_QUALIFY_ROW_IDS,
  HERMES_PURPOSE_MAX_LENGTH,
  HERMES_PURPOSE_MIN_LENGTH,
} from '@/prospection/constants/HermesContractLimits';
import { useHermesQualifyImportRows } from '@/prospection/hooks/useHermesQualifyImportRows';
import { type HermesInformationMethod } from '@/prospection/types/HermesInformationMethod';
import { type HermesInputIssue } from '@/prospection/types/HermesInputIssue';
import { validateHermesQualificationInput } from '@/prospection/utils/validateHermesQualificationInput';

const StyledForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledRadioLabel = styled.span`
  margin-left: ${themeCssVariables.spacing[2]};
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesQualificationFormProps = {
  batchId: string;
  selectedRowIds: string[];
  // Called once the call has answered, so the batch is reread.
  onQualified: () => void;
};

// Qualification creates or reuses native Company and Person records under the
// acting user's own permissions. It records the professional purpose, the
// privacy notice URL and the information method, which is why all three are
// required here rather than defaulted.
export const HermesQualificationForm = ({
  batchId,
  selectedRowIds,
  onQualified,
}: HermesQualificationFormProps) => {
  const { t, i18n } = useLingui();

  const [professionalPurpose, setProfessionalPurpose] = useState('');
  const [privacyNoticeUrl, setPrivacyNoticeUrl] = useState('');
  const [informationMethod, setInformationMethod] =
    useState<HermesInformationMethod>('already-informed');
  const [submittedIssues, setSubmittedIssues] = useState<HermesInputIssue[]>(
    [],
  );

  const { outcome, qualifyRows, resetOutcome } = useHermesQualifyImportRows();

  const validation = useMemo(
    () =>
      validateHermesQualificationInput({
        batchId,
        rowIds: selectedRowIds,
        professionalPurpose,
        privacyNoticeUrl,
        informationMethod,
      }),
    [
      batchId,
      selectedRowIds,
      professionalPurpose,
      privacyNoticeUrl,
      informationMethod,
    ],
  );

  const handleSubmit = () => {
    resetOutcome();

    if (validation.input === null) {
      setSubmittedIssues(validation.issues);
      return;
    }

    setSubmittedIssues([]);
    void qualifyRows(validation.input).then(onQualified);
  };

  const purposeLength = professionalPurpose.trim().length;
  const rowsWithErrors =
    outcome.kind === 'read' && isDefined(outcome.result.rows)
      ? outcome.result.rows.filter(
          (row) => isDefined(row.errors) && row.errors.length > 0,
        ).length
      : 0;

  return (
    <Section.Root>
      <Section.Header
        title={t`Qualify the selected rows`}
        description={t`${i18n.number(selectedRowIds.length)} rows selected, ${i18n.number(HERMES_MAX_QUALIFY_ROW_IDS)} at most.`}
      />

      <StyledForm
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Professional purpose`}</Field.Label>
          <Textarea
            value={professionalPurpose}
            onChange={(event) => setProfessionalPurpose(event.target.value)}
            rows={3}
            placeholder={t`Why these companies are being contacted.`}
          />
          <Field.Description>
            {t`${i18n.number(purposeLength)} characters, ${i18n.number(HERMES_PURPOSE_MIN_LENGTH)} to ${i18n.number(HERMES_PURPOSE_MAX_LENGTH)}.`}
          </Field.Description>
        </Field.Root>

        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Privacy notice URL`}</Field.Label>
          <Input
            value={privacyNoticeUrl}
            onChange={(event) => setPrivacyNoticeUrl(event.target.value)}
            placeholder="https://example.org/privacy"
          />
          <Field.Description>{t`HTTPS only.`}</Field.Description>
        </Field.Root>

        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Information method`}</Field.Label>
          <RadioGroup
            aria-label={t`Information method`}
            value={informationMethod}
            onValueChange={(value) => {
              // Only the two values the contract accepts are kept.
              if (
                value === 'already-informed' ||
                value === 'first-contact-notice'
              ) {
                setInformationMethod(value);
              }
            }}
          >
            <Radio value="already-informed">
              <StyledRadioLabel>{t`Contacts already informed`}</StyledRadioLabel>
            </Radio>
            <Radio value="first-contact-notice">
              <StyledRadioLabel>{t`Notice given at first contact`}</StyledRadioLabel>
            </Radio>
          </RadioGroup>
        </Field.Root>

        <HermesIssueList issues={submittedIssues} />

        <StyledActions>
          <Button
            type="submit"
            variant="solid"
            size="sm"
            loading={outcome.kind === 'running'}
          >
            {t`Qualify`}
          </Button>
        </StyledActions>

        {outcome.kind === 'read' && (
          <>
            <ProspectionNote>
              {isDefined(outcome.result.rows) ? (
                t`${i18n.number(outcome.result.rows.length)} rows answered.`
              ) : (
                <Trans>Qualification answered without readable rows.</Trans>
              )}
            </ProspectionNote>
            {rowsWithErrors > 0 && (
              <ProspectionNote role="alert">
                {t`${i18n.number(rowsWithErrors)} rows need review: see their error in the table.`}
              </ProspectionNote>
            )}
          </>
        )}

        {outcome.kind === 'unreadable' && (
          <HermesPayloadProblemNote
            problem={outcome.problem}
            subject={t`Qualification answer`}
          />
        )}

        {outcome.kind === 'failed' && (
          <HermesCallFailureNote
            failure={outcome.failure}
            fallbackMessage={t`Qualification refused.`}
          />
        )}
      </StyledForm>
    </Section.Root>
  );
};
