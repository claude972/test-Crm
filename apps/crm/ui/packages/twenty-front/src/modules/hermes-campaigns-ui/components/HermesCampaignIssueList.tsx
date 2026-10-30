import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  type HermesCampaignIssue,
  type HermesCampaignIssueCode,
} from '@/hermes-campaigns-ui/types/HermesCampaignIssue';

const StyledList = styled.ul`
  color: ${themeCssVariables.font.color.danger};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  padding-left: ${themeCssVariables.spacing[4]};
`;

type HermesCampaignIssueListProps = {
  issues: HermesCampaignIssue[];
};

// Client-side checks, each in words. The list carries role="alert" so an
// issue raised after the first paint is announced rather than only coloured.
export const HermesCampaignIssueList = ({
  issues,
}: HermesCampaignIssueListProps) => {
  const { t, i18n } = useLingui();

  if (issues.length === 0) {
    return null;
  }

  const sentence = (issue: HermesCampaignIssue): string => {
    const limit = issue.limit ?? 0;
    const variableName = issue.variableName ?? '';

    const sentences: Record<HermesCampaignIssueCode, string> = {
      'schedule-date-required': t`Pick a date.`,
      'schedule-date-not-iso': t`That date is not a calendar date.`,
      'schedule-time-required': t`Pick a time.`,
      'schedule-time-not-valid': t`That time is not a time of day.`,
      'schedule-time-zone-required': t`Pick a time zone: a wall-clock time without a zone is not a moment.`,
      'schedule-time-zone-unknown': t`This browser does not know that time zone.`,
      'schedule-moment-in-the-past': t`That moment has already passed.`,
      'subject-required': t`Write a subject.`,
      'subject-too-long': t`The subject is longer than ${i18n.number(limit)} characters.`,
      'body-required': t`Write the message.`,
      'body-too-long': t`The message is longer than ${i18n.number(limit)} characters.`,
      'body-variable-not-declared': t`The variable ${variableName} is not declared by the audience, so it would render as nothing for every recipient.`,
    };

    return sentences[issue.code];
  };

  return (
    <StyledList role="alert">
      {issues.map((issue) => (
        <li key={issue.key}>{sentence(issue)}</li>
      ))}
    </StyledList>
  );
};
