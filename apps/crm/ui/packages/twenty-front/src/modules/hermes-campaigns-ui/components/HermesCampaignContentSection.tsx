import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconAlertTriangle, IconEye } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Banner, Loader } from 'kovaa-lab-ui/primitives/feedback';
import { Field, Input } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { CAMPAIGN_BODY_EDITOR_PROFILE } from '@/activities/emails/editor/constants/CampaignBodyEditorProfile';
import { EmailEditorCanvas } from '@/activities/emails/editor/components/EmailEditorCanvas';
import { FormAdvancedTextFieldInput } from '@/advanced-text-editor/components/FormAdvancedTextFieldInput';
import { HermesCampaignIssueList } from '@/hermes-campaigns-ui/components/HermesCampaignIssueList';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
import {
  HERMES_CAMPAIGN_BODY_MAX_LENGTH,
  HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH,
} from '@/hermes-campaigns-ui/constants/HermesCampaignLimits';
import { type HermesPersonalisationVariable } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import {
  type HermesCampaignContent,
  type HermesCampaignPreviewState,
} from '@/hermes-campaigns-ui/types/HermesCampaignContent';
import {
  readCampaignBodyDocument,
  readCampaignBodyText,
} from '@/hermes-campaigns-ui/utils/campaignBodyDocument';
import { validateCampaignContent } from '@/hermes-campaigns-ui/utils/validateCampaignContent';

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledVariableHint = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledPreview = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledPreviewHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledRecipient = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledSubject = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledBody = styled.pre`
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledEditor = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 320px;
  min-width: 0;
`;

const StyledLoading = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMissing = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

type HermesCampaignContentSectionProps = {
  content: HermesCampaignContent;
  onContentChange: (content: HermesCampaignContent) => void;
  // The variables the audience declares. The content may only use these.
  declaredVariables: HermesPersonalisationVariable[];
  previewState: HermesCampaignPreviewState;
  // Read-only once the campaign is no longer a draft: editing a campaign on
  // its way would describe a message nobody will receive.
  isEditable: boolean;
};

export const HermesCampaignContentSection = ({
  content,
  onContentChange,
  declaredVariables,
  previewState,
  isEditable,
}: HermesCampaignContentSectionProps) => {
  const { t, i18n } = useLingui();

  const declaredVariableNames = useMemo(
    () => declaredVariables.map((variable) => variable.name),
    [declaredVariables],
  );

  const bodyRead = useMemo(
    () => readCampaignBodyDocument(content.body),
    [content.body],
  );

  // Counted on what the recipient reads. Counting the serialised document
  // would make an empty message look like prose and never report it missing.
  const bodyText = useMemo(
    () => readCampaignBodyText(content.body),
    [content.body],
  );

  const validation = useMemo(
    () =>
      validateCampaignContent({
        subject: content.subject,
        body: bodyText,
        subjectMaxLength: HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH,
        bodyMaxLength: HERMES_CAMPAIGN_BODY_MAX_LENGTH,
        declaredVariableNames,
      }),
    [content.subject, bodyText, declaredVariableNames],
  );

  const availableTokens = declaredVariableNames
    .map((name) => `{{${name}}}`)
    .join(' ');

  // An audience that published no variable list is not an audience that
  // forbids every variable. Rejecting tokens against an empty list here would
  // block a legitimate personalisation, so the server's own check answers.
  const issues =
    declaredVariableNames.length > 0
      ? validation.issues
      : validation.issues.filter(
          (issue) => issue.code !== 'body-variable-not-declared',
        );

  return (
    <Section.Root>
      <Section.Header
        title={t`Content`}
        description={t`Subject, message and the variables the audience declares.`}
      />

      <StyledLayout>
        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Subject`}</Field.Label>
          <Input
            value={content.subject}
            disabled={!isEditable}
            maxLength={HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH}
            onChange={(event) =>
              onContentChange({ ...content, subject: event.target.value })
            }
            placeholder={t`What the recipient reads first`}
          />
          <Field.Description>
            {t`${i18n.number(content.subject.trim().length)} of ${i18n.number(HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH)} characters.`}
          </Field.Description>
        </Field.Root>

        <Field.Root render={<StyledField />}>
          <Field.Label>{t`Message`}</Field.Label>
          {bodyRead.kind === 'unreadable' ? (
            <Banner
              role="alert"
              status="error"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`The stored message could not be read as an email document, so it is not shown rather than shown as something else.`}
            </Banner>
          ) : (
            <StyledEditor>
              <FormAdvancedTextFieldInput
                aria-label={t`Message`}
                value={
                  bodyRead.kind === 'document'
                    ? bodyRead.serializedDocument
                    : ''
                }
                readonly={!isEditable}
                placeholder={t`Write to one company, not to a list.`}
                profile={CAMPAIGN_BODY_EDITOR_PROFILE}
                EditorComponent={EmailEditorCanvas}
                minHeight={320}
                // The native editor's own serialisation is persisted as it
                // stands: the send path parses exactly this document.
                onChange={(serializedDocument) =>
                  onContentChange({ ...content, body: serializedDocument })
                }
              />
            </StyledEditor>
          )}
          <Field.Description>
            {availableTokens.length > 0
              ? t`Variables available: ${availableTokens}`
              : t`The audience published no variable list, so the variables written here are checked when the campaign is sent.`}
          </Field.Description>
        </Field.Root>

        <HermesCampaignIssueList issues={issues} />

        {validation.usedVariableNames.length > 0 && (
          <StyledVariableHint>
            {t`Used in this content: ${validation.usedVariableNames.map((name) => `{{${name}}}`).join(' ')}`}
          </StyledVariableHint>
        )}

        {!isEditable && (
          <HermesCampaignNote>
            {t`The content is read-only: this campaign is no longer a draft.`}
          </HermesCampaignNote>
        )}

        {previewState.kind === 'idle' && (
          <HermesCampaignNote>
            {t`No preview rendered yet. Rendering one emits nothing.`}
          </HermesCampaignNote>
        )}

        {previewState.kind === 'loading' && (
          <StyledLoading aria-busy="true" aria-live="polite">
            <Loader />
            <HermesCampaignNote>{t`Rendering the preview…`}</HermesCampaignNote>
          </StyledLoading>
        )}

        {previewState.kind === 'failed' && (
          <StyledPreview>
            <Banner
              role="alert"
              status="error"
              variant="soft"
              icon={<IconAlertTriangle aria-hidden="true" />}
            >
              {t`The preview could not be rendered`}
            </Banner>
            <HermesCampaignReason
              reasonCode={previewState.reasonCode}
              reason={previewState.reason}
              fallback={t`The server gave no reason. A failed preview is not an empty one: nothing is shown rather than something invented.`}
            />
          </StyledPreview>
        )}

        {previewState.kind === 'ready' && (
          <StyledPreview>
            <StyledPreviewHeader>
              <Tag
                color="gray"
                variant="outline"
                borderStyle="solid"
                startIcon={<IconEye />}
                truncate={false}
              >
                {t`Preview — nothing is emitted`}
              </Tag>
              <StyledRecipient>
                {isNonEmptyString(previewState.preview.recipientLabel)
                  ? isNonEmptyString(previewState.preview.recipientAddress)
                    ? `${previewState.preview.recipientLabel} · ${previewState.preview.recipientAddress}`
                    : previewState.preview.recipientLabel
                  : isNonEmptyString(previewState.preview.recipientAddress)
                    ? previewState.preview.recipientAddress
                    : t`Rendered without a named recipient`}
              </StyledRecipient>
            </StyledPreviewHeader>

            <StyledSubject>{previewState.preview.subject}</StyledSubject>
            <StyledBody>{previewState.preview.body}</StyledBody>

            {previewState.preview.missingVariables.length > 0 && (
              <StyledMissing>
                {previewState.preview.missingVariables.map((variable) => {
                  // The braces travel inside the value, not inside the
                  // message: a literal brace is a trap for translators.
                  const token = `{{${variable.name}}}`;

                  return (
                    <li key={variable.name}>
                      {/* Shown as missing rather than replaced by an empty
                          string, which would read as intended prose. */}
                      <Tag
                        color="amber"
                        variant="soft"
                        borderStyle="solid"
                        startIcon={<IconAlertTriangle />}
                        truncate={false}
                      >
                        {t`No value for ${token}`}
                      </Tag>
                    </li>
                  );
                })}
              </StyledMissing>
            )}

            <HermesCampaignNote>
              <Trans>
                This is a rendering, not a message. No transport was contacted,
                no recipient was reached and nothing was recorded as sent.
              </Trans>
            </HermesCampaignNote>
          </StyledPreview>
        )}

        <HermesCampaignNote>
          <Trans>
            A preview renders the content for one recipient and emits nothing.
            It is not a test, and it is not a send.
          </Trans>
        </HermesCampaignNote>
      </StyledLayout>
    </Section.Root>
  );
};
