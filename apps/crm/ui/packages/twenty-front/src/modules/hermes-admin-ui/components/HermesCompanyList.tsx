import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconCheck } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import { HermesCompanyActionNote } from '@/hermes-admin-ui/components/HermesCompanyActionNote';
import { type HermesAdminContextValidity } from '@/hermes-admin-ui/types/HermesAdminContext';
import {
  type HermesCompaniesRead,
  type HermesCompanyActionCapability,
  type HermesCompanyActionState,
} from '@/hermes-admin-ui/types/HermesCompany';
import { canWriteInHermesAdminContext } from '@/hermes-admin-ui/utils/hermesAdminWrite';

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledRow = styled.li`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledIdentity = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

const StyledMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

const StyledControls = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

type HermesCompanyListProps = {
  read: HermesCompaniesRead;
  switchCapability: HermesCompanyActionCapability;
  switchState: HermesCompanyActionState;
  contextValidity: HermesAdminContextValidity;
  // True while a write is still in flight. Switching is then withheld rather
  // than offered with a promise of cancellation: a write already sent under
  // this company can finish after the switch and is not undoable.
  hasWriteInFlight: boolean;
  onRequestSwitch: (companyId: string) => void;
  onRequestReload: () => void;
};

// The operating companies this account may enter, and which one is active.
// When the capability is absent, there is no switch button at all — not a
// disabled one, which would suggest a missing right is all that stands in the
// way — only the explanation underneath.
export const HermesCompanyList = ({
  read,
  switchCapability,
  switchState,
  contextValidity,
  hasWriteInFlight,
  onRequestSwitch,
  onRequestReload,
}: HermesCompanyListProps) => {
  const { t } = useLingui();

  const canSwitch =
    switchCapability.kind === 'available' &&
    canWriteInHermesAdminContext(contextValidity) &&
    !hasWriteInFlight;

  const isSwitching = switchState.kind === 'requesting';

  return (
    <>
      {read.kind === 'loading' && (
        <HermesAdminNote role="status">
          {t`Lecture des sociétés autorisées…`}
        </HermesAdminNote>
      )}

      {read.kind === 'unknown' && (
        <HermesAdminNote role="alert">
          {isNonEmptyString(read.message)
            ? t`Les sociétés autorisées n’ont pas pu être lues : ${read.message}`
            : t`Les sociétés autorisées n’ont pas pu être lues. Rechargez pour réessayer.`}
        </HermesAdminNote>
      )}

      {read.kind === 'reported' && read.companies.length === 0 && (
        <HermesAdminNote role="status">
          {t`Aucune société exploitante n’est autorisée pour ce compte.`}
        </HermesAdminNote>
      )}

      {read.kind === 'reported' && read.companies.length > 0 && (
        <StyledList aria-label={t`Sociétés exploitantes autorisées`}>
          {read.companies.map((company) => {
            const isActive = company.id === read.activeCompanyId;

            return (
              <StyledRow key={company.id}>
                <StyledIdentity>
                  <StyledName>
                    {isNonEmptyString(company.name)
                      ? company.name
                      : t`Société sans nom renvoyé`}
                  </StyledName>

                  {isNonEmptyString(company.trade) && (
                    <StyledMeta>{t`Activité : ${company.trade}`}</StyledMeta>
                  )}

                  {isNonEmptyString(company.primaryMailbox) && (
                    <StyledMeta>
                      {t`Boîte principale : ${company.primaryMailbox}`}
                    </StyledMeta>
                  )}
                </StyledIdentity>

                <StyledControls>
                  {/* Named in words as well as marked, so the active company
                      is never signalled by colour alone. */}
                  {isActive && (
                    <Tag
                      color="green"
                      variant="soft"
                      truncate={false}
                      startIcon={<IconCheck />}
                    >
                      {t`Société active`}
                    </Tag>
                  )}

                  {canSwitch && !isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={isSwitching}
                      onClick={() => onRequestSwitch(company.id)}
                    >
                      {t`Basculer vers cette société`}
                    </Button>
                  )}
                </StyledControls>
              </StyledRow>
            );
          })}
        </StyledList>
      )}

      {read.kind === 'reported' && read.activeCompanyId === null && (
        <HermesAdminNote role="alert">
          {t`Le serveur n’a pas indiqué de société active. Aucune n’est supposée active pour autant : les réglages restent sans cible tant qu’elle n’est pas connue.`}
        </HermesAdminNote>
      )}

      {read.kind === 'reported' && read.unreadableEntryCount > 0 && (
        <HermesAdminNote role="status">
          {t`Entrées écartées parce qu’elles n’ont pas pu être lues : ${read.unreadableEntryCount}`}
        </HermesAdminNote>
      )}

      {switchCapability.kind === 'available' && hasWriteInFlight && (
        <HermesAdminNote role="status">
          {t`Un enregistrement est en cours : la bascule attend qu’il se termine. Basculer maintenant ne l’annulerait pas — ce qui est parti est parti.`}
        </HermesAdminNote>
      )}

      <HermesCompanyActionNote
        capability={switchCapability}
        state={switchState}
        actionLabel={t`Bascule de société`}
        onRequestReload={onRequestReload}
      />
    </>
  );
};
