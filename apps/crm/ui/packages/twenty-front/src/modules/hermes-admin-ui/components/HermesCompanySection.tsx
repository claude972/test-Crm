import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconBuildingSkyscraper } from 'kovaa-lab-ui/icon';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import {
  HermesCompanyAddForm,
  type HermesCompanyDraft,
} from '@/hermes-admin-ui/components/HermesCompanyAddForm';
import { HermesCompanyList } from '@/hermes-admin-ui/components/HermesCompanyList';
import { HermesCompanyMembersTable } from '@/hermes-admin-ui/components/HermesCompanyMembersTable';
import { HermesCompanySummary } from '@/hermes-admin-ui/components/HermesCompanySummary';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import {
  type HermesCompaniesRead,
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
  type HermesCompanyMembersRead,
} from '@/hermes-admin-ui/types/HermesCompany';
import { readHermesActiveCompany } from '@/hermes-admin-ui/utils/hermesCompanyAction';

const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledSubheading = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledIdentity = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

type HermesCompanySectionProps = {
  companiesRead: HermesCompaniesRead;
  membersRead: HermesCompanyMembersRead;
  switchCapability: HermesCompanyActionCapability;
  switchState: HermesCompanyActionState;
  addCapability: HermesCompanyActionCapability;
  addState: HermesCompanyActionState;
  contextValidity: HermesAdminContextValidity;
  hasWriteInFlight: boolean;
  onRequestSwitch: (companyId: string) => void;
  onRequestAdd: (draft: HermesCompanyDraft) => void;
  onRequestReload: () => void;
};

// Operating companies: which one is active, which ones are allowed, who is in
// the active one, and the two commands the multi-company capability governs.
// The distinction the section is built around: an operating company is a
// workspace owning connections, policies and members. It is not a customer
// record, and the screen says so rather than leaving it implied.
export const HermesCompanySection = ({
  companiesRead,
  membersRead,
  switchCapability,
  switchState,
  addCapability,
  addState,
  contextValidity,
  hasWriteInFlight,
  onRequestSwitch,
  onRequestAdd,
  onRequestReload,
}: HermesCompanySectionProps) => {
  const { t } = useLingui();

  const activeCompany = readHermesActiveCompany(companiesRead);

  return (
    <Section.Root>
      <Section.Header
        title={t`Sociétés exploitantes`}
        description={t`Une société exploitante est un espace de travail : elle possède ses connexions, ses politiques et ses membres. Ce n’est pas une fiche client.`}
      />

      <StyledStack>
        <HermesAdminRuleNote>
          {t`Ne pas confondre : une société exploitante est l’espace depuis lequel vous travaillez, tandis qu’une société cliente est un enregistrement du CRM, visible dans les contacts et les affaires. Les deux ne se créent ni ne se règlent au même endroit.`}
        </HermesAdminRuleNote>

        <div>
          <StyledSubheading>{t`Société active`}</StyledSubheading>

          {companiesRead.kind === 'loading' && (
            <HermesAdminNote role="status">
              {t`Lecture de la société active…`}
            </HermesAdminNote>
          )}

          {companiesRead.kind === 'unknown' && (
            <HermesAdminNote role="alert">
              {t`La société active n’a pas pu être lue. Aucun réglage n’est présenté comme portant sur une société tant qu’elle est inconnue.`}
            </HermesAdminNote>
          )}

          {companiesRead.kind === 'reported' && activeCompany === null && (
            <HermesAdminNote role="alert">
              {t`Aucune société active n’est connue. Cet écran ne choisit pas à votre place : rien n’est réglé tant qu’une société n’est pas active.`}
            </HermesAdminNote>
          )}

          {activeCompany !== null && (
            <StyledIdentity>
              <Tag
                color="gray"
                variant="outline"
                truncate={false}
                startIcon={<IconBuildingSkyscraper />}
              >
                {t`Espace de travail`}
              </Tag>

              <StyledName>
                {isNonEmptyString(activeCompany.name)
                  ? activeCompany.name
                  : t`Société sans nom renvoyé`}
              </StyledName>

              {isNonEmptyString(activeCompany.trade) && (
                <StyledMeta>{t`Activité : ${activeCompany.trade}`}</StyledMeta>
              )}

              {isNonEmptyString(activeCompany.primaryMailbox) && (
                <StyledMeta>
                  {t`Boîte principale : ${activeCompany.primaryMailbox}`}
                </StyledMeta>
              )}
            </StyledIdentity>
          )}
        </div>

        <div>
          <StyledSubheading>{t`Sociétés autorisées`}</StyledSubheading>

          <HermesCompanyList
            read={companiesRead}
            switchCapability={switchCapability}
            switchState={switchState}
            contextValidity={contextValidity}
            hasWriteInFlight={hasWriteInFlight}
            onRequestSwitch={onRequestSwitch}
            onRequestReload={onRequestReload}
          />
        </div>

        <div>
          <StyledSubheading>{t`Ajouter une société`}</StyledSubheading>

          <HermesCompanyAddForm
            capability={addCapability}
            state={addState}
            contextValidity={contextValidity}
            onSubmit={onRequestAdd}
            onRequestReload={onRequestReload}
          />
        </div>

        <div>
          <StyledSubheading>{t`Membres de la société active`}</StyledSubheading>

          <HermesCompanyMembersTable
            read={membersRead}
            companyId={activeCompany?.id ?? null}
            companyName={activeCompany?.name ?? null}
          />
        </div>

        <div>
          <StyledSubheading>
            {t`Récapitulatif des sociétés autorisées`}
          </StyledSubheading>

          <HermesCompanySummary read={companiesRead} />
        </div>
      </StyledStack>
    </Section.Root>
  );
};
