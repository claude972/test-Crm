import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Fragment } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { ClientContextInstant } from '@/client-context/components/ClientContextInstant';
import { ClientContextItemCard } from '@/client-context/components/ClientContextItemCard';
import { CLIENT_CONTEXT_FORMS_SOURCE } from '@/client-context/constants/ClientContextSources';
import { type ClientFormResponse } from '@/client-context/types/ClientFormResponse';
import { ProspectionNote } from '@/prospection/components/ProspectionNote';

const StyledMeta = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledDetails = styled.details`
  font-size: ${themeCssVariables.font.size.sm};

  summary {
    color: ${themeCssVariables.font.color.tertiary};
    cursor: pointer;
    width: fit-content;
  }

  summary:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: ${themeCssVariables.spacing[0.5]};
  }
`;

const StyledAnswers = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content minmax(0, 1fr);
  margin: ${themeCssVariables.spacing[2]} 0 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

type ClientFormResponseCardProps = {
  response: ClientFormResponse;
};

// One Forms response this workspace received. The answers are folded away:
// they belong on the record, but not in front of which form was answered and
// when.
export const ClientFormResponseCard = ({
  response,
}: ClientFormResponseCardProps) => {
  const { t, i18n } = useLingui();

  return (
    <ClientContextItemCard
      Icon={CLIENT_CONTEXT_FORMS_SOURCE.Icon}
      title={response.formTitle}
      untitledLabel={t`Unnamed form`}
      syncStatus={response.syncStatus}
      syncReason={response.syncReason}
      provenance={response.provenance}
      fallbackSourceName={CLIENT_CONTEXT_FORMS_SOURCE.name}
    >
      {/* When the respondent submitted it, which is not when this workspace
          received it: the provenance below carries that second instant. */}
      <StyledMeta>
        <Trans>Submitted</Trans>{' '}
        <ClientContextInstant value={response.submittedAt} />
      </StyledMeta>

      {response.answers === null ? (
        // An unreadable answers array is an unknown set of answers, never a
        // response that carried none.
        <ProspectionNote role="alert">
          <Trans>Answers unreadable for this response.</Trans>
        </ProspectionNote>
      ) : response.answers.length === 0 ? (
        <ProspectionNote>
          <Trans>No answer in this response.</Trans>
        </ProspectionNote>
      ) : (
        <StyledDetails>
          <summary>
            {t`Answers (${i18n.number(response.answers.length)})`}
          </summary>
          <StyledAnswers>
            {response.answers.map((answer) => (
              <Fragment key={answer.id}>
                <dt>
                  {isNonEmptyString(answer.label) ? (
                    answer.label
                  ) : (
                    <StyledMissing>{t`Unnamed question`}</StyledMissing>
                  )}
                </dt>
                {/* A blank answer and an unreadable one are different
                    facts, so an empty string is not shown as unknown. */}
                <dd>
                  {answer.value === null ? (
                    <StyledMissing>{t`Unreadable`}</StyledMissing>
                  ) : answer.value.trim().length === 0 ? (
                    <StyledMissing>{t`Left blank`}</StyledMissing>
                  ) : (
                    answer.value
                  )}
                </dd>
              </Fragment>
            ))}
          </StyledAnswers>
        </StyledDetails>
      )}
    </ClientContextItemCard>
  );
};
