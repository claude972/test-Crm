# Revue indépendante prospection — f9d0db96c

Révision examinée : `f9d0db96c045783c25827362bca1898d948585b1`, branche root `feat/codex-hermes-integration`. Lecture seule de AccessService, ProspectionService, ImportStateService, DTO/entity/policy et du parcours natif d'audience/brouillon/suppression. Aucun fichier production ni test existant modifié. Seuls un nouveau `hermes-prospection-review.spec.ts` et ce rapport sont possédés par cette revue.

## P1 — L'autorisation de staging ne vérifie pas les statuts DB de l'utilisateur et de la structure

`hermes-prospection-access.service.ts:19–28` filtre l'adhésion par ses trois identifiants, puis `:30–52` relit l'affectation et les permissions du rôle. Il ne filtre ni `user.disabled`, ni les suppressions de user/workspace, ni `workspace.activationStatus`. Un administrateur ayant encore une adhésion/affectation peut donc être accepté par ce service alors que son état DB ne permet plus l'accès. `HermesConnectorsService:53–65` fournit déjà le modèle de filtres relationnels à réutiliser.

Reproduction unitaire : un petit double de repository applique réellement les prédicats WHERE relationnels demandés à une ligne avec user désactivé/supprimé ou workspace INACTIVE/SUSPENDED/supprimé. Les **5 cas attendent ForbiddenException et échouent sur f9d0db96c** : assertAllowed résout sans erreur. Les contrôles membre A présenté comme B et affectation de rôle retirée sont bien refusés ; un administrateur vivant est accepté.

Portée : ce test prouve le défaut de filtre du service, pas un échange HTTP complet. Le resolver refuse les types de principaux non autorisés, mais AuthPrincipalGuard/classifyAuthPrincipal ne relit pas ces états. Le JWT utilise CoreEntityCacheService ; WorkspaceNotSuspendedGuard vérifie l'objet de contexte. Leur présence ne prouve donc pas la revalidation DB attendue lorsqu'un contexte ancien reste disponible. La suppression soft de l'adhésion elle-même est déjà exclue par le comportement normal de findOne TypeORM.

Correction recommandée : joindre/filtrer au même findOne une adhésion non supprimée, user correspondant actif/non supprimé, workspace correspondant ACTIVE/non supprimé, puis conserver la relecture DB du rôle et le refus des permissions restreintes. Aucun accès global implicite ni bypass ORM. Correctif confié à l'agent propriétaire, aucune modification production de cette revue.

## P2 — Le replay d'un DRAFT ne revalide ni les destinataires natifs ni la liste modifiée

`hermes-prospection.service.ts:244–258` trouve le campaignId déterministe et revient immédiatement si son statut reste DRAFT. Les vérifications de personnes/adresse primaire `:266–284` ne s'exécutent donc que pour un nouveau brouillon. La composition de la liste existante n'est pas contrôlée avant de renvoyer les identifiants dérivés.

Trois régressions unitaires échouent sur la révision examinée : après changement de l'adresse primaire, après archivage du contact (absent du find normal) et après modification de la liste native vers une autre personne, le même input renvoie toujours un succès DRAFT. Le quatrième contrôle de ce parcours vérifie qu'un replay légitime conserve exactement ses campaignId/listId et n'insère rien : **il passe**, cette idempotence doit être conservée.

Correction recommandée : avant tout retour existing-DRAFT, revalider les personnes disponibles et leurs adresses qualifiées avec les mêmes permissions ; vérifier aussi que la campagne référence la liste attendue et que ses membres correspondent exactement aux personnes demandées, sinon conflit explicite sans écriture. Ne pas recréer un brouillon ou remplacer silencieusement une audience éditée. Une campagne déjà avancée reste refusée comme actuellement.

Gravité et limite : `createCampaignDraft` insère seulement un DRAFT, retourne `sendingAvailable:false` et n'appelle aucun sender. Aucun envoi n'est reproduit ou déclenché ici. Le parcours natif `message-campaign-audience.service.ts:157–174` relit la liste et les e-mails primaires actuels ; les suppressions sont appliquées dans resolveAudience, puis revérifiées au handoff dans `message-campaign-batch-delivery.service.ts:155–168`. Le défaut observé est donc une fausse confirmation du brouillon/audience qualifiée à l'import, pas la preuve qu'un e-mail a déjà été envoyé ni que la suppression native est contournée. La qualification d'import n'est pas automatiquement une validation d'un autre e-mail apparu ultérieurement.

## Isolation et frontières transactionnelles relues

Le workspace ne vient pas d'un champ de ces DTO : le resolver le dérive du contexte authentifié. `HermesImportStateEntity` a workspaceId comme clé primaire et une FK CASCADE vers Workspace ; read/mutate ciblent systématiquement cet ID. Le verrou pessimiste de `HermesImportStateService:52–56` sérialise les mutations du staging par workspace et relit l'accès après attente du verrou. Aucun accès A vers B démontré par cette revue ; le test négatif d'adhésion étrangère passe. Les batch/row IDs inconnus sont recherchés uniquement dans cet état courant.

Les écritures natives de qualification/brouillon utilisent leurs propres `runInWorkspaceTransaction`, tandis que la transaction core du staging reste ouverte. La vérification de taille et le save du staging interviennent après l'opération (`hermes-import-state.service.ts:64–72`). Un échec de staging peut donc suivre un commit natif ; le code reconnaît cette fenêtre et utilise des IDs stables/recherche d'e-mail pour reprise. Ne pas présenter ces deux frontières comme une transaction globale. Aucun rollback inter-connexions ou scénario de concurrence SQL n'a été exécuté ici ; il doit être vérifié par la recette native cloud, sans déduire une corruption de la seule architecture. Une révocation pendant une longue opération n'est pas relue après son callback : ce test ne prouve pas cette course et n'en invente pas une exploitation.

## Vérification reproductible

Les sources prospection exactes de f9d0db96c ont été matérialisées sous `/private/tmp/hermes-prospection-review-f9d0db96c` par git show et utilisées par un mapper Jest dédié. Ainsi la reproduction ne dépend pas des éditions concurrentes root. Dépendances existantes en lecture seule, @swc/jest et cache temporaires ; aucun package installé, DB/service local ou cloud lancé.

Nouveau spec : `apps/crm/ui/packages/twenty-server/src/engine/core-modules/hermes-prospection/__tests__/hermes-prospection-review.spec.ts`. Exécution ciblée : **12 tests, 4 passent, 8 échecs de régression attendus** sur le snapshot initial (5 accès invalides +3 replays), résultat non déclaré vert. Les repositories et transactions y sont des doubles explicites, pas une preuve TypeORM/SQL/native complète. Prettier du seul spec et git diff --check exécutés. Le recontrôle du SHA corrigé reste à effectuer quand l'agent propriétaire le publie.
