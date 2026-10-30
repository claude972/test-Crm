# Revue indépendante frontend — 705177d46

Révision examinée exactement : `705177d46beeeeb60be0483db7ff016e03e9a95f`, branche Claude `feat/claude-hermes-connectors-ui`, worktree `claude-frontend-baseline` consulté **en lecture seule**, propre avant et après revue. Comparaison avec l'ancêtre P0 `0523dad07965bfb1c032729c00863e0940425e3f`. AGENTS.md, DESIGN.md, règles UI, contrat dashboard et prompt Monday sur `missions/p0-stabilization` lus ; skills web-design-guidelines et vercel-react-best-practices appliqués. Aucun fichier Claude modifié.

## Intégration progressive possible

- `9f57915fb4d1df6f6cbcc88125848d6894c740f3` : deux fichiers de vocabulaire/badge de synchronisation. Cherry-pick indépendant du chantier Char, sous réserve de corriger le libellé accessible ci-dessous avant consommation.
- `705177d46beeeeb60be0483db7ff016e03e9a95f` : huit fichiers, types/requêtes dashboard, badge métrique, clé de cache et tests. Requêtes conformes au contrat publié ; aucun resolver appelé à ce stade. Même réserve pour le statut PARTIAL avant branchement UI.
- Ne pas intégrer le merge `af03bb4f2ce21c43e95502b0c71482618e406e75` en bloc au titre de Monday : il réconcilie l'historique P0/Char, inclut beaucoup de fichiers hors chantier cible et ne représente pas une nouvelle refonte. Les corrections Vite `6974f96ca` et worker `6c7bcd48a` sont des corrections P0 distinctes à comparer au code déjà intégré, pas une dépendance de redesign à recopier aveuglément.

## Corrections prioritaires

### P2 — PARTIAL n'est pas identifiable par lecteur d'écran

`apps/crm/ui/packages/twenty-front/src/modules/structures/components/StructureMetricValue.tsx:40` puis `:47` : pour une valeur non nulle, AVAILABLE=17 et PARTIAL=17 rendent le même texte « 17 ». Seules la couleur et la bordure pointillée changent. Aucun texte/nom accessible n'annonce le caractère partiel ; les dénominateurs du total ne sont pas affichés par ce composant.

Correction : conserver le nombre mais ajouter une mention localisée « Partiel » visible ou un texte de lecteur d'écran explicite. Quand le composant sert à un total, exposer « X structures contributrices sur Y » à partir des champs du DTO, ou laisser cette responsabilité à un parent clairement documenté et testé. Tester au minimum AVAILABLE=0, PARTIAL avec valeur, FORBIDDEN=null et UNAVAILABLE=null par leur texte/nom accessible, sans dépendre d'une couleur/bordure. Le commentaire de `structures/types/HermesStructureMetric.ts:5` est aussi à corriger : PARTIAL peut porter une somme non nulle selon le contrat.

### P2 — Le message fournisseur peut effacer entièrement le statut

`apps/crm/ui/packages/twenty-front/src/modules/connectors/components/ConnectorSyncTag.tsx:95` utilise `message ?? labels[status]`. Une chaîne vide produit donc un badge sans libellé ; une raison telle que « Request received » remplace « Failed » ou « Waiting for confirmation ». Les icônes ne compensent pas ce manque : la primitive `twenty-ui/src/primitives/data-display/Tag/Tag.tsx` place startIcon dans un conteneur aria-hidden. Le caractère non connecté/attente/erreur devient ambigu, particulièrement pour un lecteur d'écran.

Correction : toujours conserver le libellé localisé du statut et ajouter la raison fournisseur comme détail facultatif ; ignorer une raison vide/blanche. Le texte non fiable doit rester un nœud texte React. Tester les cinq statuts avec raison absente, vide, longue et contenant du HTML littéral. Aucun dangerouslySetInnerHTML ni faux succès implicite n'est présent dans le code examiné.

Ces composants sont encore inutilisés : ce sont des défauts des nouvelles briques à régler avant leur consommation, pas la preuve d'une régression d'écran déjà livré.

## Isolation et cache — garanties réelles, sans purge globale

`structures/utils/buildStructureScopeCacheKey.ts:31–43` compose session, IDs uniques triés et bornes. Pour des UUID et dates conformes au contrat, les périmètres explicites A, B, A+B sont distincts ; deux sessions distinctes ne partagent pas la clé. Une permutation/doublon ne crée pas un autre périmètre. Les formes IDs omis (« all »), vide (« none ») et liste explicite restent différentes : le frontend ne développe pas lui-même la liste autorisée du serveur. Aucun défaut de collision entre ces entrées conformes identifié.

Cependant, cette fonction pure n'accorde aucun droit et ne possède aucun cache : `rg` trouve uniquement sa déclaration et son test, aucun appel applicatif, useQuery, store ou politique Apollo. Le sessionKey est fourni par le futur appelant ; sa rotation effective lors d'un changement d'utilisateur/session n'est donc pas prouvée. Une révocation dans la même session ne change pas automatiquement une clé à scope omis : ne pas présenter ce helper comme une invalidation ou une recette d'isolation achevée.

Branchement attendu : rattacher la clé à une identité/session effectivement renouvelée et invalider **uniquement les entrées de dashboard/structures de cette session et du périmètre concerné** lors d'un changement d'adhésion/permissions ou d'une réponse d'accès refusé ; le scope omis doit être revalidé après ces événements. Une révision des droits dans la clé est une autre possibilité si un vrai signal serveur est disponible. Aucune purge globale de tout le cache CRM n'est requise ou proposée. Le serveur doit toujours relire les droits ; l'ancien chiffre ne doit pas rester affiché après révocation pendant la revalidation. Recette A/B/C, reconnexion et révocation obligatoire lors du branchement.

## Couverture réelle du redesign et des états

La recherche de références au HEAD examiné trouve seulement les déclarations des deux composants/requêtes et le test de clé. Aucun écran, route, hook réseau, sélecteur « Société / Toutes mes sociétés », navigation Monday, tableau/fiche client, conversation, pipeline ou réglage n'est branché. Aucun token de thème ni police n'est modifié par ces deux commits. Le thème et le CRM P0 restent ceux de l'ancêtre. Les chargements, erreurs réseau, absence de sociétés, reconnexion, responsive, focus et contraste ne peuvent donc pas être déclarés livrés/validés pour une nouvelle page.

Aucune donnée de démonstration, MSW ou réponse métier mockée n'est ajoutée par ces deux commits. Le vocabulaire frontend est explicitement distinct des DTO backend ; les requêtes correspondent aux noms/champs du contrat publié. Cela constitue une fondation de présentation/contrat, **pas un écran connecté ni une refonte Monday testable**.

Vérifications exécutées indépendamment : `git diff --check` sur les nouveaux fichiers frontend réussi ; les **7 tests existants de buildStructureScopeCacheKey passent** en Jest ciblé, processus unique, dépendances existantes en lecture seule, configuration/cache temporaires, sans écriture dans le worktree Claude. Ils vérifient composition/permutation/duplication/omission/vide/périodes, pas cache Apollo, serveur, révocation, composants ou parcours navigateur. Aucun build, typecheck, rendu, test a11y automatisé ou recette cloud effectué par cette revue. Les messages de commit Claude déclarent eux-mêmes ces dernières limites.
