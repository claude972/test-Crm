import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { Section } from 'kovaa-lab-ui/components/layout';
import {
  IconAlertTriangle,
  IconCircleOff,
  IconHelpCircle,
  IconShield,
} from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesAdminNote,
  HermesAdminRuleNote,
} from '@/hermes-admin-ui/components/HermesAdminNote';
import { useHermesMcpToolSurface } from '@/hermes-admin-runtime/hooks/useHermesMcpToolSurface';
import {
  type HermesMcpTool,
  readHermesMcpGrantsWithoutTool,
} from '@/hermes-admin-runtime/types/HermesMcpToolSurface';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

// La colonne des refus est la plus large : un refus tronqué se lirait comme un
// refus que le serveur n'a pas donné.
const HERMES_MCP_GRID_TEMPLATE_COLUMNS =
  'minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.8fr)';

const StyledName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

const StyledMissing = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

const StyledGrants = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledNotes = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

// Les outils que le serveur MCP de la société annonce, les accords de son
// opérateur et les verdicts du serveur.
//
// LES QUATRE CHOSES QUE CE PANNEAU NE DOIT JAMAIS LAISSER CROIRE :
// « prêt » n'est pas une preuve qu'un outil fonctionne — la découverte
// n'appelle aucun outil ; un accord qui pointe vers un outil absent reste
// visible ; une liste tronquée n'est pas la surface entière ; et l'instant
// affiché est celui où l'on a demandé, pas celui où ce serait encore vrai.
export const HermesMcpToolSurfacePanel = () => {
  const { t } = useLingui();

  const state = useHermesMcpToolSurface();

  // Trois réponses, jamais deux : accordé, refusé, et inconnu parce que le
  // serveur n'a pas publié de valeur.
  const renderFlag = (value: boolean | null, granted: string, denied: string) =>
    value === null ? (
      <Tag
        color="gray"
        variant="outline"
        borderStyle="dashed"
        startIcon={<IconHelpCircle />}
        truncate={false}
        title={t`Le serveur n’a pas publié cette valeur.`}
      >
        {t`Non publié`}
      </Tag>
    ) : value ? (
      <Tag
        color="green"
        variant="soft"
        startIcon={<IconShield />}
        truncate={false}
      >
        {granted}
      </Tag>
    ) : (
      <Tag
        color="gray"
        variant="outline"
        startIcon={<IconCircleOff />}
        truncate={false}
      >
        {denied}
      </Tag>
    );

  const renderRefusals = (tool: HermesMcpTool) => {
    if (tool.refusals.length > 0) {
      return tool.refusals.join(', ');
    }

    // Aucun refus publié n'est une absence de refus, pas une preuve que
    // l'outil est appelable : cela est dit dans la colonne « appelable ».
    return <StyledMissing>{t`Aucun refus publié`}</StyledMissing>;
  };

  return (
    <Section.Root>
      <Section.Header
        title={t`Outils MCP découverts`}
        description={t`Ce que le serveur MCP de cette société annonce, ce que vous avez accordé, et ce que le serveur a refusé.`}
      />

      {state.kind === 'loading' && (
        <HermesAdminNote role="status">
          <Trans>Lecture de la surface d’outils…</Trans>
        </HermesAdminNote>
      )}

      {/* Une réponse d'autorisation, jamais présentée comme une panne. */}
      {state.kind === 'denied' && (
        <HermesAdminNote role="status">
          <Trans>
            Votre rôle ne permet pas de lire la surface d’outils MCP.
          </Trans>
        </HermesAdminNote>
      )}

      {state.kind === 'unreadable' && (
        <HermesAdminNote role="alert">
          <Trans>
            La surface d’outils n’a pas pu être lue. Aucun outil, aucun accord
            et aucun refus n’est supposé pour autant.
          </Trans>
        </HermesAdminNote>
      )}

      {state.kind === 'read' && (
        <StyledNotes>
          {/* Un fait énoncé, qui nomme ce qu'il faut configurer. */}
          {state.status === 'not-configured' && (
            <HermesAdminNote role="status">
              <Trans>
                Aucun serveur MCP n’est configuré pour cette société : il n’y a
                donc aucun outil à annoncer. Enregistrez une connexion MCP pour
                cette société dans les réglages de connexions, ou renseignez
                HERMES_MCP_CONNECTIONS sur ce déploiement.
              </Trans>
            </HermesAdminNote>
          )}

          {/* Ni l'un ni l'autre n'est un problème d'outil, et le code du
              serveur est montré tel quel plutôt qu'habillé. */}
          {(state.status === 'unavailable' ||
            state.status === 'configuration-error') && (
            <HermesAdminNote role="alert">
              {state.status === 'unavailable'
                ? isNonEmptyString(state.errorCode)
                  ? t`Le serveur MCP n’a pas répondu (${state.errorCode}). Ce n’est pas un problème d’outil : aucun outil n’a été interrogé.`
                  : t`Le serveur MCP n’a pas répondu. Ce n’est pas un problème d’outil : aucun outil n’a été interrogé.`
                : isNonEmptyString(state.errorCode)
                  ? t`La configuration MCP n’a pas pu être lue (${state.errorCode}). Ce n’est pas un problème d’outil.`
                  : t`La configuration MCP n’a pas pu être lue. Ce n’est pas un problème d’outil.`}
            </HermesAdminNote>
          )}

          {state.status === 'ready' && (
            <>
              {/* Le piège central : « prêt » décrit une annonce, pas un
                  fonctionnement. Le DTO le dit, le panneau le répète. */}
              <HermesAdminRuleNote>
                <Trans>
                  Le serveur a répondu et voici ce qu’il annonce. Aucun outil
                  n’est appelé pendant la découverte : ceci ne prouve pas qu’un
                  outil fonctionne, pas même l’outil de rédaction.
                </Trans>
              </HermesAdminRuleNote>

              <HermesAdminNote role="status">
                {isNonEmptyString(state.draftingTool)
                  ? t`Outil de rédaction annoncé : ${state.draftingTool}. Annoncé, pas vérifié.`
                  : t`Aucun outil de rédaction n’est annoncé.`}
              </HermesAdminNote>

              {state.tools.length === 0 ? (
                <HermesAdminNote role="status">
                  <Trans>
                    Le serveur a répondu sans annoncer d’outil.
                  </Trans>
                </HermesAdminNote>
              ) : (
                <Table>
                  <TableRow
                    gridTemplateColumns={HERMES_MCP_GRID_TEMPLATE_COLUMNS}
                  >
                    <TableHeader>{t`Outil`}</TableHeader>
                    <TableHeader>{t`Accord`}</TableHeader>
                    <TableHeader>{t`Appelable`}</TableHeader>
                    <TableHeader>{t`Refus du serveur`}</TableHeader>
                  </TableRow>
                  <TableBody>
                    {state.tools.map((tool, index) => (
                      <TableRow
                        key={tool.name ?? `tool-${index}`}
                        gridTemplateColumns={
                          HERMES_MCP_GRID_TEMPLATE_COLUMNS
                        }
                      >
                        <TableCell>
                          {isNonEmptyString(tool.name) ? (
                            <StyledName title={tool.title ?? undefined}>
                              {tool.name}
                            </StyledName>
                          ) : (
                            <StyledMissing>{t`Nom non publié`}</StyledMissing>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderFlag(
                            tool.authorized,
                            t`Accordé`,
                            t`Non accordé`,
                          )}
                        </TableCell>
                        <TableCell>
                          {renderFlag(
                            tool.callable,
                            t`Appelable`,
                            t`Non appelable`,
                          )}
                        </TableCell>
                        <TableCell>{renderRefusals(tool)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          {/* Un accord qui ne pointe vers aucun outil annoncé. Gardé visible
              plutôt que silencieusement écarté : c'est pour cela que le
              serveur publie les accords dans une liste séparée. */}
          {(() => {
            const orphanGrants = readHermesMcpGrantsWithoutTool(
              state.authorizedTools,
              state.tools,
            );

            return orphanGrants.length === 0 ? null : (
              <>
                <HermesAdminNote role="alert">
                  <Trans>
                    Des accords ne correspondent à aucun outil annoncé par le
                    serveur. Ils restent affichés : un accord qui pointe vers
                    un outil absent est un fait, pas une absence.
                  </Trans>
                </HermesAdminNote>
                <StyledGrants>
                  {orphanGrants.map((name) => (
                    <li key={name}>
                      <Tag
                        color="orange"
                        variant="soft"
                        startIcon={<IconAlertTriangle />}
                        truncate={false}
                        title={t`Ce nom est accordé, mais le serveur ne l’a jamais annoncé.`}
                      >
                        {name}
                      </Tag>
                    </li>
                  ))}
                </StyledGrants>
              </>
            );
          })()}

          {/* Une liste tronquée n'est pas la surface entière. */}
          {state.truncated === true && (
            <HermesAdminNote role="alert">
              <Trans>
                La découverte s’est arrêtée avant la fin : cette liste est
                incomplète et n’est pas la surface entière du serveur.
              </Trans>
            </HermesAdminNote>
          )}

          {state.truncated === null && (
            <HermesAdminNote role="alert">
              <Trans>
                Le serveur n’a pas dit si cette liste est complète : elle n’est
                donc pas présentée comme la surface entière.
              </Trans>
            </HermesAdminNote>
          )}

          {/* L'instant où l'on a demandé. Pas une affirmation que c'est encore
              vrai maintenant. */}
          {isNonEmptyString(state.checkedAt) && (
            <HermesAdminNote role="status">
              {t`Demandé le ${state.checkedAt}. Rien depuis cet instant n’est reflété ici.`}
            </HermesAdminNote>
          )}
        </StyledNotes>
      )}
    </Section.Root>
  );
};
