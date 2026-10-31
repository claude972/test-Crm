import { useQuery } from '@apollo/client/react';

import { HERMES_MCP_TOOL_SURFACE } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesMcpToolSurface';
import { type HermesMcpToolSurfaceReadState } from '@/hermes-admin-runtime/types/HermesMcpToolSurface';
import { readHermesMcpToolSurface } from '@/hermes-admin-runtime/utils/readHermesMcpToolSurface';
import { readHermesRuntimeFailure } from '@/hermes-admin-runtime/utils/readHermesRuntimeFailure';
import { isDefined } from 'kovaa-lab-shared/utils';

// Ce que le serveur MCP de la société annonce et ce que son opérateur a
// accordé, lu de l'autorité qui l'applique.
//
// Sans argument : rien ne désigne une société. Un refus reste un refus et ne
// devient jamais une surface vide.
export const useHermesMcpToolSurface = (): HermesMcpToolSurfaceReadState => {
  const { data, loading, error } = useQuery<{
    hermesMcpToolSurface: unknown;
  }>(HERMES_MCP_TOOL_SURFACE, {
    // Une découverte datée. Une réponse en cache continuerait d'afficher des
    // outils et des accords qui ont pu changer depuis.
    fetchPolicy: 'network-only',
  });

  if (loading) {
    return { kind: 'loading' };
  }

  if (isDefined(error)) {
    return readHermesRuntimeFailure(error).kind === 'denied'
      ? { kind: 'denied' }
      : { kind: 'unreadable' };
  }

  return readHermesMcpToolSurface(data?.hermesMcpToolSurface);
};
