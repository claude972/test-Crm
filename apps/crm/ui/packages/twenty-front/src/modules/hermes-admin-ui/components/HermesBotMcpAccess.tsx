import { styled } from '@linaria/react';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { LightCopyIconButton } from '@/ui/input/components/LightCopyIconButton';
import { buildMcpServerUrl } from '@/settings/mcp/utils/mcpSetup';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

const StyledAccess = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  code {
    overflow-wrap: anywhere;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: ${themeCssVariables.spacing[3]};
  }
`;

export const HermesBotMcpAccess = () => {
  const endpoint = buildMcpServerUrl(REACT_APP_SERVER_BASE_URL);
  return (
    <StyledAccess>
      <p>
        Ton bot se connecte directement à ce CRM par MCP. Aucune dépendance à
        Forms ou Calendly.
      </p>
      <div>
        <strong>Adresse MCP</strong>
        <br />
        <code>{endpoint}</code>
        <LightCopyIconButton copyText={endpoint} />
      </div>
      <p>
        Authentification : <code>Authorization: Bearer VOTRE_CLE</code>
      </p>
      <p>
        Pour la gestion complète du CRM, crée une clé dédiée au bot avec le rôle
        Administrateur. Ce rôle permet de lire, créer, modifier et supprimer les
        données de cet espace. La connexion MCP ne déclenche aucun envoi à elle
        seule.
      </p>
      <nav aria-label="Clés de connexion du bot">
        <a href={getSettingsPath(SettingsPath.NewApiKey)}>
          Créer la clé du bot
        </a>
        <a href={getSettingsPath(SettingsPath.Roles)}>Vérifier les droits</a>
      </nav>
      <p>
        Ouvre la gestion des clés pour la régénérer ou la révoquer. Après
        régénération, remplace la clé dans ton bot.
      </p>
      <a href={getSettingsPath(SettingsPath.Developers)}>
        Gérer, régénérer ou révoquer les clés du bot
      </a>
    </StyledAccess>
  );
};
