import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  type HermesInputIssue,
  type HermesIssueCode,
} from '@/prospection/types/HermesInputIssue';

const StyledList = styled.ul`
  color: ${themeCssVariables.font.color.danger};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

type HermesIssueListProps = {
  issues: HermesInputIssue[];
};

// The contract's own bounds, said as rules. They are checked before the call,
// so this list is what blocks the submit rather than a server error.
export const HermesIssueList = ({ issues }: HermesIssueListProps) => {
  const { t, i18n } = useLingui();

  if (issues.length === 0) {
    return null;
  }

  const describe = (issue: HermesInputIssue): string => {
    const row = issue.row ?? 0;
    const field = issue.field ?? '';
    const count = issue.count ?? 0;
    const limit = issue.limit ?? 0;

    const messages: Record<HermesIssueCode, string> = {
      'external-batch-id-required': t`Batch id required.`,
      'batch-name-required': t`Batch name required.`,
      'source-url-required': t`Source URL required.`,
      'source-url-not-http': t`Source URL must be http or https.`,
      'source-url-has-credentials': t`Source URL must carry no credentials.`,
      'collected-at-required': t`Collection date required.`,
      'collected-at-not-iso': t`Collection date unreadable.`,
      'rows-required': t`Paste at least one row.`,
      'rows-not-json': t`Rows are not valid JSON.`,
      'rows-not-array': t`Expected a JSON array of rows, or an object with a rows array.`,
      'rows-too-many': t`${i18n.number(count)} rows pasted; ${i18n.number(limit)} per batch at most.`,
      'row-not-an-object': t`Row ${i18n.number(row)}: expected an object.`,
      'row-company-required': t`Row ${i18n.number(row)}: company name required.`,
      'row-field-not-a-string': t`Row ${i18n.number(row)}: ${field} must be text.`,
      'row-unknown-field': t`Row ${i18n.number(row)}: field ${field} is not accepted.`,
      'state-too-large': t`Batch too large: ${i18n.number(count)} bytes for a ${i18n.number(limit)} byte limit.`,
      'purpose-too-short': t`Purpose: ${i18n.number(count)} characters, ${i18n.number(limit)} needed.`,
      'purpose-too-long': t`Purpose: ${i18n.number(count)} characters, ${i18n.number(limit)} at most.`,
      'privacy-notice-required': t`Privacy notice URL required.`,
      'privacy-notice-not-https': t`Privacy notice URL must use HTTPS.`,
      'privacy-notice-has-credentials': t`Privacy notice URL must carry no credentials.`,
      'information-method-required': t`Choose how these contacts are informed.`,
      'no-row-selected': t`Select at least one row.`,
      'too-many-rows-selected': t`${i18n.number(count)} rows selected; ${i18n.number(limit)} at most.`,
      'draft-name-required': t`Campaign name required.`,
      'draft-name-too-long': t`Campaign name: ${i18n.number(count)} characters, ${i18n.number(limit)} at most.`,
      'draft-subject-required': t`Subject required.`,
      'no-qualified-row-selected': t`Select at least one qualified row.`,
    };

    return messages[issue.code];
  };

  return (
    <StyledList role="alert">
      {issues.map((issue) => (
        <li key={issue.key}>{describe(issue)}</li>
      ))}
    </StyledList>
  );
};
