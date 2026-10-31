import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAdminNote } from '@/hermes-admin-ui/components/HermesAdminNote';
import {
  type HermesCompanyMemberState,
  type HermesCompanyMembersRead,
} from '@/hermes-admin-ui/types/HermesCompany';
import {
  readHermesMemberRights,
  readHermesMemberRoleLabels,
  type HermesMemberRight,
  type HermesMemberRightStanding,
} from '@/hermes-admin-ui/types/HermesMemberRights';
import { filterHermesMembersByCompany } from '@/hermes-admin-ui/utils/hermesCompanyAction';

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  width: 100%;

  th,
  td {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    overflow-wrap: anywhere;
    padding: ${themeCssVariables.spacing[2]};
    text-align: left;
    vertical-align: top;
  }

  th {
    color: ${themeCssVariables.font.color.tertiary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }

  td {
    color: ${themeCssVariables.font.color.secondary};
  }

  /* At 390px a three-column table would either scroll the page sideways or
     squeeze every cell to one word. Each row becomes a labelled block
     instead, keeping the header words as the labels. */
  @media (max-width: 480px) {
    thead {
      display: none;
    }

    tr {
      border-bottom: 1px solid ${themeCssVariables.border.color.light};
      display: block;
      padding: ${themeCssVariables.spacing[2]} 0;
    }

    td {
      border-bottom: none;
      display: flex;
      gap: ${themeCssVariables.spacing[2]};
      justify-content: space-between;
      padding: ${themeCssVariables.spacing[1]} 0;
    }

    td::before {
      color: ${themeCssVariables.font.color.tertiary};
      content: attr(data-label);
      flex: 0 0 auto;
    }
  }
`;

type HermesCompanyMembersTableProps = {
  read: HermesCompanyMembersRead;
  companyId: string | null;
  companyName: string | null;
};

// Who is in this operating company, with their role and their state. Read
// only: nothing on this screen changes anyone's rights.
export const HermesCompanyMembersTable = ({
  read,
  companyId,
  companyName,
}: HermesCompanyMembersTableProps) => {
  const { t } = useLingui();

  // What each right actually permits, in the operator's terms rather than the
  // flag's name.
  const rightLabels: Record<HermesMemberRight, string> = {
    CONFIGURE_CONNECTIONS: t`Configurer les connexions`,
    READ_RECORDS: t`Lire les fiches`,
    WRITE_RECORDS: t`Modifier les fiches`,
    DELETE_RECORDS: t`Supprimer des fiches`,
    USE_BOT_TOOLS: t`Utiliser les outils du bot`,
  };

  // « Inconnu » is a flag the server did not publish. It is never shown as a
  // refusal: telling an administrator that someone lacks a right, when the
  // right was simply not reported, would be a false statement about a person.
  const standingLabels: Record<HermesMemberRightStanding, string> = {
    granted: t`oui`,
    denied: t`non`,
    unknown: t`inconnu`,
  };

  const stateLabels: Record<HermesCompanyMemberState, string> = {
    ACTIVE: t`Actif`,
    INVITED: t`Invitation en attente`,
    SUSPENDED: t`Suspendu`,
  };

  const members =
    read.kind === 'reported'
      ? filterHermesMembersByCompany(read.members, companyId)
      : [];

  const otherCompanyCount =
    read.kind === 'reported' ? read.members.length - members.length : 0;

  if (read.kind === 'loading') {
    return (
      <HermesAdminNote role="status">{t`Lecture des membres…`}</HermesAdminNote>
    );
  }

  if (read.kind === 'unknown') {
    return (
      <HermesAdminNote role="alert">
        {isNonEmptyString(read.message)
          ? t`Les membres n’ont pas pu être lus : ${read.message}`
          : t`Les membres n’ont pas pu être lus. Rechargez pour réessayer.`}
      </HermesAdminNote>
    );
  }

  if (companyId === null) {
    return (
      <HermesAdminNote role="status">
        {t`Aucune société exploitante active n’est indiquée, donc aucun membre n’est affiché.`}
      </HermesAdminNote>
    );
  }

  if (members.length === 0) {
    return (
      <HermesAdminNote role="status">
        {t`Le serveur n’a signalé aucun membre pour cette société.`}
      </HermesAdminNote>
    );
  }

  return (
    <>
      <StyledTable
        aria-label={
          isNonEmptyString(companyName)
            ? t`Membres de ${companyName}`
            : t`Membres de la société exploitante active`
        }
      >
        <thead>
          <tr>
            <th scope="col">{t`Membre`}</th>
            <th scope="col">{t`Rôles`}</th>
            <th scope="col">{t`Droits effectifs`}</th>
            <th scope="col">{t`État`}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td data-label={t`Membre`}>
                {isNonEmptyString(member.displayName)
                  ? member.displayName
                  : isNonEmptyString(member.email)
                    ? member.email
                    : t`Membre sans nom renvoyé`}
              </td>
              {/* The server's own wording for every role the member holds.
                  A label says what somebody called the role; the next column
                  says what it actually opens. */}
              <td data-label={t`Rôles`}>
                {member.roles === null
                  ? t`Rôles non lus`
                  : member.roles.length === 0
                    ? t`Aucun rôle`
                    : readHermesMemberRoleLabels(member.roles).join(' · ') ||
                      t`Rôle sans libellé renvoyé`}
              </td>
              {/* Read from the role's permission flags, never from its name. */}
              <td data-label={t`Droits effectifs`}>
                {readHermesMemberRights(member.roles)
                  .map(
                    ({ right, standing }) =>
                      `${rightLabels[right]} : ${standingLabels[standing]}`,
                  )
                  .join(' · ')}
              </td>
              <td data-label={t`État`}>
                {member.state !== null
                  ? stateLabels[member.state]
                  : isNonEmptyString(member.unknownState)
                    ? t`État non reconnu : ${member.unknownState}`
                    : t`Non publié par le serveur`}
              </td>
            </tr>
          ))}
        </tbody>
      </StyledTable>

      {otherCompanyCount > 0 && (
        <HermesAdminNote role="status">
          {t`Membres écartés parce qu’ils appartiennent à une autre société exploitante : ${otherCompanyCount}`}
        </HermesAdminNote>
      )}

      {read.unreadableEntryCount > 0 && (
        <HermesAdminNote role="status">
          {t`Entrées écartées parce qu’elles n’ont pas pu être lues : ${read.unreadableEntryCount}`}
        </HermesAdminNote>
      )}

      <HermesAdminNote>
        {t`Les droits d’un membre s’arrêtent à cette société. Ils sont lus sur les indicateurs de permission du rôle, pas sur son nom : un rôle appelé « Administrateur » qui ne porte aucun indicateur n’ouvre rien, et un rôle au nom inattendu peut être celui qui configure les connexions.`}
      </HermesAdminNote>

      <HermesAdminNote>
        {t`Un membre peut porter plusieurs rôles : ses droits sont alors la réunion de ce qu’ils accordent. « Inconnu » signifie que le serveur n’a pas publié l’indicateur, ce qui n’est pas un refus.`}
      </HermesAdminNote>

      <HermesAdminNote>
        {t`L’état d’un membre n’est pas publié par le serveur pour un espace de travail : il n’existe pas de champ actif, invité ou suspendu sur cet objet. Il est donc dit non publié plutôt que deviné d’après les rôles.`}
      </HermesAdminNote>
    </>
  );
};
