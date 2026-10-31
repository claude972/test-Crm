import { gql } from '@apollo/client';

// Ce que le serveur MCP de la société annonce, et ce que son opérateur a
// accordé. Chaque champ ci-dessous est vérifié sur
// hermes-mcp-tool-surface.dto.ts.
//
// Sans argument : la société est celle de la session. Rien ici ne porte de
// secret — ni point de terminaison, ni identifiant d'accès, ni identité
// d'opérateur n'est renvoyé par cette requête.
//
// `authorizedTools` est une liste SÉPARÉE de `tools` exprès : un nom accordé
// que le serveur n'a jamais annoncé doit rester visible. Et `status: READY` ne
// prouve pas qu'un outil fonctionne : la découverte n'appelle aucun outil.
export const HERMES_MCP_TOOL_SURFACE = gql`
  query HermesMcpToolSurface {
    hermesMcpToolSurface {
      status
      checkedAt
      errorCode
      authorizedTools
      draftingTool
      truncated
      tools {
        name
        title
        authorized
        callable
        refusals
        isDraftingTool
      }
    }
  }
`;
