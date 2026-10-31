// Ce que le serveur MCP de la société annonce, tel que le navigateur est
// autorisé à le connaître.
//
// À QUOI CETTE SURFACE SERT. Un opérateur doit pouvoir répondre sans quitter
// l'écran : quels outils le serveur annonce, lesquels j'ai accordés, et quand
// un outil n'est pas appelable, ce que le serveur a refusé.
//
// CE QU'ELLE N'EST PAS. Ce n'est pas une preuve de fonctionnement. La
// découverte n'appelle aucun outil : un état « prêt » dit que le serveur a
// répondu et ce qu'il annonce, rien de plus. Un accord qui pointe vers un
// outil absent, une liste tronquée et un instant de lecture déjà passé sont
// trois faits distincts qui ne doivent jamais être lissés.

// Un outil découvert, avec le verdict du serveur. Chaque champ est une lecture
// défensive : null veut toujours dire « la charge ne portait pas de valeur
// utilisable », et jamais false.
export type HermesMcpTool = {
  name: string | null;
  title: string | null;
  // Accordé par l'opérateur. Null est un accord inconnu, jamais un refus.
  authorized: boolean | null;
  // Appelable selon le serveur. Null est inconnu, jamais « non appelable ».
  callable: boolean | null;
  // Ce que le serveur a refusé, dans ses propres termes.
  refusals: string[];
  isDraftingTool: boolean | null;
};

// Les quatre états que le serveur publie, gardés distincts.
//
// - 'not-configured' : la société n'a pas de serveur MCP configuré. C'est un
//   fait énoncé, pas une panne ;
// - 'ready' : le serveur a répondu et voici ce qu'il annonce. JAMAIS une
//   preuve qu'un outil fonctionne ;
// - 'unavailable' : le serveur n'a pas répondu. Ce n'est pas un problème
//   d'outil ;
// - 'configuration-error' : la configuration n'a pas pu être lue. Non plus.
export const HERMES_MCP_STATUSES = [
  'not-configured',
  'ready',
  'unavailable',
  'configuration-error',
] as const;

export type HermesMcpStatus = (typeof HERMES_MCP_STATUSES)[number];

// Une table, jamais une transformation : un état hors des quatre publiés reste
// null et la lecture devient illisible, pour qu'un cinquième ne soit pas rendu
// silencieusement comme l'un des quatre.
export const readHermesMcpStatus = (value: unknown): HermesMcpStatus | null =>
  value === 'NOT_CONFIGURED'
    ? 'not-configured'
    : value === 'READY'
      ? 'ready'
      : value === 'UNAVAILABLE'
        ? 'unavailable'
        : value === 'CONFIGURATION_ERROR'
          ? 'configuration-error'
          : null;

// Ce que le client sait de la surface, par opposition à ce qu'elle dit.
//
// 'denied' est une réponse d'autorisation, pas un échec. 'unreadable' est une
// absence de connaissance et ne se lit jamais comme « aucun outil ».
export type HermesMcpToolSurfaceReadState =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'unreadable' }
  | {
      kind: 'read';
      status: HermesMcpStatus;
      // L'instant où l'on a DEMANDÉ. Pas une affirmation que c'est encore
      // vrai maintenant.
      checkedAt: string | null;
      errorCode: string | null;
      // Les noms accordés, y compris ceux que le serveur n'a jamais annoncés.
      authorizedTools: string[];
      draftingTool: string | null;
      // Null est une complétude inconnue, jamais une liste complète.
      truncated: boolean | null;
      tools: HermesMcpTool[];
    };

// Les noms accordés qu'aucun outil annoncé ne porte. Lu des deux listes que le
// serveur publie, jamais déduit : c'est précisément pourquoi `authorizedTools`
// est une liste séparée de `tools`.
export const readHermesMcpGrantsWithoutTool = (
  authorizedTools: string[],
  tools: HermesMcpTool[],
): string[] => {
  const advertised = new Set(
    tools
      .map((tool) => tool.name)
      .filter((name): name is string => name !== null),
  );

  return authorizedTools.filter((name) => !advertised.has(name));
};
