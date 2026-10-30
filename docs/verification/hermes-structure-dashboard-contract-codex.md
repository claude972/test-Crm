# Contrat backend Hermès — structures et synthèse autorisée

Base d’implémentation : `0523dad07965bfb1c032729c00863e0940425e3f`, branche isolée `feat/p0-structure-dashboard-backend`. Ce document décrit l’API en cours d’implémentation ; aucune réussite cloud ou recette multi-structure n’est encore revendiquée.

## Identité et accès

**Une structure = un workspace existant, identifié uniquement par workspaceId.** UserWorkspaceEntity porte l’adhésion ; les rôles, permissions objet, restrictions de champs et règles de lignes restent ceux du moteur existant. Aucun regroupement/table/migration n’est ajouté. Une fiche Company est une entreprise cliente et ne devient pas une structure.

API GraphQL `/metadata`, authentification utilisateur standard ou workspace-agnostic existante. API keys, applications/OAuth clients, agents, impersonation et playground refusés. Aucun privilège supplémentaire pour canAccessFullAdminPanel. Les adhésions sont relues en DB pour chaque requête et avant restitution d’un dashboard. Une sélection contenant un ID inconnu, interdit, supprimé, suspendu ou révoqué échoue entièrement avec une erreur générique, avant lecture des données métier. La réponse ne distingue pas existence et absence d’une structure interdite.

HIDDEN reste absent du sélecteur et du dashboard commun implicite. Un filtre explicite à un seul workspace HIDDEN déjà actif dans la session peut lire uniquement ce workspace. Les espaces non provisionnés ne produisent aucun dashboard. Sans structure autorisée, listes et totaux restent vides. Une connexion à une structure ne contourne pas l’authentification supplémentaire d’une autre structure : les métriques concernées restent FORBIDDEN lorsque la session courante ne suffit pas (SSO distinct, 2FA cible, fournisseur non activé).

## Opérations et types exacts

```graphql
query HermesStructures {
  hermesAuthorizedStructures {
    workspaceId
    displayName
    isCurrent
    requiresAuthentication
    workspaceUrls { subdomainUrl customUrl }
  }
}

query HermesDashboard($input: HermesStructureDashboardInput) {
  hermesStructureDashboard(input: $input) {
    generatedAt
    periodStart
    periodEnd
    partial
    structures {
      structure {
        workspaceId displayName isCurrent requiresAuthentication
        workspaceUrls { subdomainUrl customUrl }
      }
      metrics { key value status }
    }
    totals { key value status contributingStructures totalStructures }
  }
}
```

Input `HermesStructureDashboardInput` : `workspaceIds?: UUID[]` (maximum 100, uniques), `periodStart?: DateTime`, `periodEnd?: DateTime`. Input omis/IDs omis = toutes les structures autorisées visibles. `workspaceIds: []` = périmètre vide ; `[A]` = société A ; `[A,B]` = consolidation explicitement filtrée. Période par défaut = tout l’historique ; bornes UTC facultatives sur createdAt, début inclus/fin exclue. Début doit être strictement antérieur à fin. Un maximum de 100 structures est évalué par requête, sans troncature silencieuse.

DTO `HermesAuthorizedStructure` : workspaceId UUID!, displayName String!, isCurrent Boolean!, requiresAuthentication Boolean!, workspaceUrls WorkspaceUrls! (type existant).

DTO `HermesStructureMetric` : key String!, value Float nullable, status HermesStructureMetricStatus!. Clés **companies**, **people**, **opportunities**, **tasks** : nombre de fiches non supprimées effectivement lisibles pour ce membre, dans la période. Les compteurs réutilisent `WorkspaceOrmManager.getRepositoryWithContextPermissions` dans le contexte user propre à chaque workspace ; pas de system/bypass pour les données métier. Les règles de lignes restent appliquées par les requêtes ORM.

DTO `HermesStructureMetricTotal` : mêmes champs + contributingStructures Int!, totalStructures Int!. Statuts enum : AVAILABLE, FORBIDDEN, UNAVAILABLE, PARTIAL. Une métrique interdite ou indisponible vaut null, jamais zéro. Un total partiel vaut la somme des seules contributions disponibles avec status PARTIAL et dénominateurs explicites ; si aucune contribution n’est disponible, value=null. Un compteur disponible égal à zéro reste AVAILABLE. `partial=true` dès qu’une métrique attendue n’est pas disponible. Une panne de source ne masque pas les autres métriques autorisées.

DTO `HermesStructureDashboard` : generatedAt DateTime!, periodStart/periodEnd DateTime nullable, partial Boolean!, structures [HermesStructureDashboardRow!]!, totals [HermesStructureMetricTotal!]!. Les totaux additionnent des fiches par structure, sans déduplication d’identités inter-sociétés. Aucun montant/devise/taux n’est inventé ou additionné dans ce premier lot.

## Consommation frontend

La sélection du dashboard est un filtre explicite validé côté serveur, **pas un changement silencieux de session**. Les liens de détail changent de workspace par le mécanisme d’authentification existant puis revérifient les droits. Les écritures restent dans une structure explicite. Les caches frontend incluent utilisateur/session, IDs triés du périmètre et bornes de période ; ils sont vidés sur changement de session/révocation. Le backend n’ajoute aucun cache d’agrégats et ne repose pas sur un workspaceId envoyé par le frontend pour accorder les droits.

Les permissions et rôles réutilisent les caches du moteur et leurs invalidations existantes, sans élargissement ni cache de dashboard supplémentaire. La suppression d’une adhésion est relue directement en DB ; la recette doit aussi mesurer la propagation effective des mutations de rôle officielles. Les garanties d’autorisation ne constituent pas une preuve de recette A/B/C tant que les tests runtime et navigateur sur le SHA intégré ne sont pas exécutés.
