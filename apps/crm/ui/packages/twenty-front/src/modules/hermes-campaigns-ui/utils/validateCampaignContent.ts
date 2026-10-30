import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_CAMPAIGN_VARIABLE_PATTERN } from '@/hermes-campaigns-ui/constants/HermesCampaignLimits';
import { type HermesCampaignIssue } from '@/hermes-campaigns-ui/types/HermesCampaignIssue';
import { type HermesCampaignContent } from '@/hermes-campaigns-ui/types/HermesCampaignContent';

// Every {{variable}} written in the text, in the order it first appears.
export const readCampaignContentVariables = (text: string): string[] => {
  // A global regexp carries its own cursor, so a fresh one per call keeps two
  // reads from starting where the previous one stopped.
  const pattern = new RegExp(HERMES_CAMPAIGN_VARIABLE_PATTERN.source, 'g');
  const names: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const name = match[1];

    if (isDefined(name) && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
};

type ValidateCampaignContentArgs = {
  subject: string;
  body: string;
  subjectMaxLength: number;
  bodyMaxLength: number;
  // Variables the audience actually declares. One written in the content but
  // absent from this list would render as nothing for every recipient, which
  // is a defect worth naming before anything is sent.
  declaredVariableNames: string[];
};

export type ValidatedCampaignContent = {
  // Null when any check failed.
  content: HermesCampaignContent | null;
  issues: HermesCampaignIssue[];
  usedVariableNames: string[];
};

export const validateCampaignContent = ({
  subject,
  body,
  subjectMaxLength,
  bodyMaxLength,
  declaredVariableNames,
}: ValidateCampaignContentArgs): ValidatedCampaignContent => {
  const issues: HermesCampaignIssue[] = [];

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();

  if (trimmedSubject.length === 0) {
    issues.push({ key: 'subject-required', code: 'subject-required' });
  } else if (trimmedSubject.length > subjectMaxLength) {
    issues.push({
      key: 'subject-too-long',
      code: 'subject-too-long',
      limit: subjectMaxLength,
    });
  }

  if (trimmedBody.length === 0) {
    issues.push({ key: 'body-required', code: 'body-required' });
  } else if (trimmedBody.length > bodyMaxLength) {
    issues.push({
      key: 'body-too-long',
      code: 'body-too-long',
      limit: bodyMaxLength,
    });
  }

  const usedVariableNames = readCampaignContentVariables(
    `${subject}\n${body}`,
  );

  for (const name of usedVariableNames) {
    if (!declaredVariableNames.includes(name)) {
      issues.push({
        key: `body-variable-not-declared:${name}`,
        code: 'body-variable-not-declared',
        variableName: name,
      });
    }
  }

  return {
    content:
      issues.length === 0
        ? { subject: trimmedSubject, body: trimmedBody }
        : null,
    issues,
    usedVariableNames,
  };
};
