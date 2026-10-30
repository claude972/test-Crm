import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { type HermesCompaniesRead } from '@/hermes-admin-ui/types/HermesCompany';

const StyledDefinitions = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  grid-template-columns: max-content 1fr;
  margin: 0;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.xs};
  }

  dd {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0;

    dd {
      margin-bottom: ${themeCssVariables.spacing[2]};
    }
  }
`;

type HermesCompanySummaryProps = {
  read: HermesCompaniesRead;
};

// A read-only recap of every operating company this account is allowed into.
//
// It exists so the scope of the whole screen is visible at a glance: which
// companies exist, which one is active, and therefore which one everything
// else on this page is editing.
export const HermesCompanySummary = ({ read }: HermesCompanySummaryProps) => {
  const { t } = useLingui();

  if (read.kind === 'loading') {
    return (
      <HermesAdminNote role="status">
        {t`Lecture du récapitulatif…`}
      </HermesAdminNote>
    );
  }

  if (read.kind === 'unknown') {
    return (
      <HermesAdminNote role="alert">
        {t`Le récapitulatif n’a pas pu être lu, donc il n’est pas affiché : une liste partielle laisserait croire que les autres sociétés n’existent pas.`}
      </HermesAdminNote>
    );
  }

  if (read.companies.length === 0) {
    return (
      <HermesAdminNote role="status">
        {t`Aucune société exploitante autorisée à récapituler.`}
      </HermesAdminNote>
    );
  }

  return (
    <>
      <StyledDefinitions>
        {read.companies.map((company) => (
          <HermesCompanySummaryRow
            key={company.id}
            name={
              isNonEmptyString(company.name)
                ? company.name
                : t`Société sans nom renvoyé`
            }
            detail={[
              isNonEmptyString(company.trade) ? company.trade : null,
              isNonEmptyString(company.primaryMailbox)
                ? company.primaryMailbox
                : null,
              company.id === read.activeCompanyId
                ? t`société active`
                : t`société autorisée, non active`,
            ]
              .filter(isNonEmptyString)
              .join(' · ')}
          />
        ))}
      </StyledDefinitions>

      <HermesAdminNote>
        {t`Ce récapitulatif est en lecture seule. Chaque société possède ses propres connexions, politiques et membres : un réglage pris dans l’une n’agit jamais sur une autre.`}
      </HermesAdminNote>
    </>
  );
};

// One company's line. Split out so the definition list stays a definition
// list: a term and its description, not two unrelated grid cells.
const HermesCompanySummaryRow = ({
  name,
  detail,
}: {
  name: string;
  detail: string;
}) => (
  <>
    <dt>{name}</dt>
    <dd>{detail}</dd>
  </>
);
