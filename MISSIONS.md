# Contrainte produit prioritaire — 29 octobre 2026

Instruction explicite du propriétaire : **web et PWA uniquement**. Cette contrainte vaut pour toutes les missions présentes et futures de ce projet. Aucune application native iOS/Android, aucun portage Expo/React Native, build natif ou publication sur les stores. Préserver la stack web existante. Le responsive mobile et les capacités PWA restent dans le périmètre web ; ne pas ajouter de cache hors ligne de données privées ou authentifiées sans conception explicite de leur isolation. Poursuivre le P0 et ses vérifications ; cette consigne ne demande aucune refonte.

# Missions

## Mission: Stabilisation P0 de test-Crm

Mission ID: p0-stabilization
Coordination branch: missions/p0-stabilization
Base revision: 05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6
Corrections: CORRECTIONS.md (repository root)

## Objective

Préserver les modifications locales, reprendre les réparations vérifiables du dépôt, rétablir une base constructible et préparer le travail frontend, sans migration de stack, perte de données ou déploiement en production.

## Shared contracts and dependencies

Origin: https://github.com/claude972/test-Crm. La branche historique est fix/crm-workspace-paths. Le checkout test-Crm contient les originaux non publiés ; lecture de sources autorisée, modification interdite par cette mission. Ne pas lire les fichiers .env/.runtime ni publier de secrets. La sauvegarde des sources et les bases restent privées.

Le backend actif est apps/crm/ui/packages/twenty-server. Les formats de chiffrement, marqueurs SDK et cookies persistants doivent rester compatibles. Pas de nouvelle API P1 avant accord commun. Les catalogues générés ne font pas partie des réparations de sources.

Codex possède backend, scripts, infrastructure, manifests/lockfile et coordination. Claude possède inventaire frontend et backlog ; aucune implémentation visuelle dans cette première affectation. La bibliothèque UI manquante a été reprise comme dépendance upstream par Codex, sans refonte. Rapports historiques sous docs/verification conservés et référencés ; le suivi partagé courant est CORRECTIONS.md sur cette branche.

## Claude assignment
- agent: claude
- status: in_progress
- branch: chore/claude-frontend-inventory
- deliverables: inventaire frontend étayé, backlog priorisé et revue ciblée Forms/Char ; publier docs/verification/frontend-inventory-claude.md et éventuellement docs/handoff/frontend-backlog.md, puis rapport partagé dans CORRECTIONS.md.
- owned files: les deux documents ci-dessus ; sa section de rapport et ses constats dans CORRECTIONS.md. Aucune source produit modifiée pour cet inventaire.
- acceptance criteria: SHA inspecté explicite ; distinguer sources publiées, modifications locales, contrôles exécutés et hypothèses ; preuves par fichier/ligne ; critères de correction ; aucune validation visuelle ou intégrée sans exécution ; commit/push et PR brouillon vers chore/p0-stabilization ; revue des commits Forms ff366e7ea/db4d81302 et Char 2bd457ecc.
- verification report: CORRECTIONS.md, section p0-stabilization / claude
- implementation revision: aucun rapport publié à la reprise ; le worktree contient bb11083776b05f4998d6ddc1a5f15e2deb16539e après actualisation par Claude.
- preview: aucune vérifiée ; inventaire statique autorisé en l'absence d'environnement prêt.
- blockers: rapport encore attendu ; une session Claude déjà active sur la mission #5 poursuit le travail. Ne pas créer de doublon.

## Codex assignment
- agent: codex
- status: ready_for_review
- branch: chore/p0-stabilization
- deliverables: sauvegarde privée vérifiée, réparations backend/systeme ciblées, CI significative, état réel et corrections des échecs.
- owned files: apps/crm/ui/packages/twenty-server, twenty-shared, marqueur SDK partagé, scripts/, infra/, configuration/lockfiles et documentation de coordination ; réparations backend Char et identifiants Forms déjà publiés.
- acceptance criteria: originaux inchangés ; secrets non publiés ; identifiants et imports réparés ; compatibilités persistantes conservées ; contrôles en ligne avec artefacts vérifiés ; revue croisée et limites explicites ; preview combinée seulement si réellement disponible.
- verification report: CORRECTIONS.md, section p0-stabilization / codex
- implementation revision: 89ab4e8b17c039fec3e2ea29d2e90fac436c156b (code/CI), c0318cf0b (rapports)
- preview: aucune vérifiée ; build intégré non validé.
- blockers: contrôle partagé vert dans CI 40969724576 ; frontend, Cal.diy, build intégré, preview et revue croisée restent ouverts.

## Cross-verification

Claude examine les commits Codex désignés et consigne ses constats ; Codex relit le rapport/frontend de Claude sur son SHA exact. CORRECTIONS.md vide à sa création ne signifie pas absence de défaut. Les missions restent in_progress tant que les corrections, vérifications et limites applicables ne sont pas résolues.

---

## Mission: Réparer la base frontend P0 et vérifier la construction combinée

Mission ID: p0-frontend-baseline
Coordination branch: missions/p0-stabilization
Base revision: c0318cf0b33134c4c292affe395009a6bd3b4662
Corrections: CORRECTIONS.md (repository root)

## Objective

Après l'inventaire de la mission #5, reprendre les réparations frontend locales nécessaires à une base constructible. Corriger les identifiants invalides, imports et chemins ; conserver le design et le comportement métier. Cette mission reste P0, sans refonte ni fonctionnalité P1.

## Shared contracts and dependencies

Dépendance obligatoire : rapport de p0-stabilization / claude publié et SHA d'inventaire prêt à relire. Ne pas démarrer cette mission à la place de la livraison de l'inventaire. Vérifier le dernier état de CORRECTIONS.md et fetch les branches avant de revendiquer le travail.

Le checkout test-Crm contient les originaux, uniquement en lecture pour cette reprise. Ne pas toucher à ses .env, .runtime, données ou modifications. Utiliser un worktree distinct pour chaque branche d'implémentation. Les SHA complets de départ effectifs sont à consigner avant édition ; le commit de base publié ci-dessus est immuable et peut être résolu par git.

Conserver les valeurs de formats persistants, clés de dérivation, cookies, marqueur __kovaa-labHttpResponse, identifiants de données et noms de paquets réels. Un renommage esthétique ne justifie pas de changer un protocole. Aucun changement de contrat API, de schéma, d'authentification, de catalogue généré ou de lockfile partagé sans coordination explicite avec Codex. Pas de SSO ou de faux état connecté. Ne pas intégrer silencieusement les pages Outils clients si leurs dépendances ne sont pas présentes ; proposer le plus petit découpage constructible et consigner la décision.

## Claude assignment — p0-frontend-baseline
- agent: claude
- status: ready_for_review — rapport partagé publié ; checkpoint `dd07d39d0e135b8844ebb1f1cb6fbe08edbde678`, PR #9
- branch: fix/claude-frontend-baseline
- deliverables: réparations frontend de syntaxe et chemins en commits ciblés, contrôles pertinents et rapport partagé.
- owned files: apps/crm/ui/packages/twenty-front et twenty-front-component-renderer ; frontend Char sous apps/crm/bot/app/javascript et templates HTML/ERB nécessaires à ses globals ; apps/crm/bot/package.json uniquement pour les imports registry réparés. Ne pas toucher aux sources backend, types shared, migrations, lockfile CRM, bibliothèque UI importée ou scripts de Codex sans coordination.
- acceptance criteria: lire AGENTS.md/DESIGN.md et les consignes proches ; inspecter les sources et l'interface disponible ; reprendre uniquement les changements compris et vérifier les dépendances correspondantes ; aucune nouvelle direction visuelle ; sources TS/JS/Vue réparées, absence d'identifiants illégaux démontrée par contrôles adaptés ; build/typecheck ou limites précisément consignés ; originaux conservés ; aucun secret ; commits poussés ; preview Vercel isolée vérifiée si le bundle et la configuration permettent de la produire, sinon blocage explicite ; revue Codex du SHA exact requise.
- verification report: CORRECTIONS.md, section p0-frontend-baseline / claude ; conserver aussi un rapport docs/verification/frontend-baseline-claude.md.
- implementation revision: `dd07d39d0e135b8844ebb1f1cb6fbe08edbde678` — lots `7a9431428` (twenty-front, 53 fichiers), `90d5bc163` (renderer, 172 fichiers), `2671be330`/`4fe7f40c5` (contrôleur et workflow), `82f9804ae`/`dd07d39d0` (rapport). Contrôleur frontend à 0 échec sur 13 015 sources, contre 1 336 échecs sur 226 fichiers avant. Aucun build ni typecheck : installation du workspace tentée et échouée, détail dans CORRECTIONS.md.
- preview: aucune à ce stade ; ne pas utiliser la production comme preview.
- blockers: inventaire livré dans PR #6, SHA 1501776ca799b8ce1720fc330ff04dbf00598b39 ; précisions P0-DOC-001 à 003 à traiter et rapport partagé à publier. Codex confirme la base c0318cf0b33134c4c292affe395009a6bd3b4662 et les décisions techniques de CORRECTIONS.md ; aucun choix de marque/police n'est requis pour cette réparation P0.

### Prise de mission par Claude — 29 octobre 2026

Les deux conditions d'entrée sont remplies avant toute édition de source :

- **Rapport partagé publié** : section « Mission p0-stabilization — agent: claude » de CORRECTIONS.md, dans ce même commit.
- **Précisions documentaires traitées** : P0-DOC-001, 002 et 003 corrigées sur `chore/claude-frontend-inventory`, commits `ad140e2fa445544e2f59b906067862f13d8eda7e` puis `d2700a7c091861da0ed0951612f21cfd37aa62d8` (ce dernier reprend la relecture Codex `1f4985461` : résidu DNS/registre de la ligne 258, portée de la preuve du marqueur, récapitulatif du § 11).

Paramètres effectifs de la reprise :

- base de départ résolue et consignée : `c0318cf0b33134c4c292affe395009a6bd3b4662`
- branche d'implémentation : `fix/claude-frontend-baseline`, dans un **worktree distinct** `/Volumes/Stockage/dev/hermes-crm/claude-frontend-baseline`
- worktree de coordination séparé pour cette branche de missions ; checkout `test-Crm` en lecture seule, HEAD `05972c1de`, non modifié

Nouveaux fichiers pris en propriété au titre de l'extension accordée, enregistrés ici avant édition :

- `scripts/check-frontend-p0.cjs` — contrôleur frontend dédié : parsing, imports internes, et vérification de l'existence réelle des assets avec filtrage raisonné des suffixes Vite
- `.github/workflows/p0-frontend-baseline.yml` — workflow dédié, déclenché sur la branche d'implémentation, exposant `workflow_call` et un artefact de bundle pour l'intégration combinée de Codex

`scripts/check-crm-p0.cjs`, les workflows backend existants, les sources backend, les types partagés, les migrations, le lockfile CRM et la bibliothèque UI importée **ne sont pas modifiés**. Toute nécessité réelle de toucher au contrôleur partagé sera transmise à Codex sous forme de diff ciblé.

Décisions reçues et appliquées sans nouvel arbitrage : icônes `IconTwentyStar` / `IconTwentyStarFilled` conservées et consommateurs corrigés ; champ serveur `allowRequestsToKovaaLabCRMIcons` suivi tel quel ; marqueur `__kovaa-labHttpResponse` préservé à l'identique ; basenames `Twenty*` conservés ; aucune décision de marque, police, domaine ou contrat P1 n'est attendue pour cette réparation.

### Prompt de démarrage Claude

```text
Tu prends la mission p0-frontend-baseline uniquement après avoir livré l'inventaire #5. Lis les fichiers MISSIONS.md et CORRECTIONS.md sur origin/missions/p0-stabilization, confirme ton affectation et vérifie qu'aucun autre agent ne l'a prise. Crée ta branche fix/claude-frontend-baseline dans un worktree distinct, sur le commit commun résolu et consigné avec Codex. Lis les règles et les sources existantes. Compare les réparations locales en lecture seule ; ne copie pas aveuglément tous les changements et ne publie pas les catalogues régénérés. Corrige uniquement les identifiants JS/TS/Vue invalides et les chemins nécessaires au frontend constructible, sans refaire le design ni ajouter P1. Conserve les protocoles et les valeurs persistantes. Coordonne les fichiers partagés avant toute édition. Vérifie syntaxe, imports, types/build selon les dépendances réellement disponibles. Publie les commits, une PR brouillon vers chore/p0-stabilization, le rapport dans CORRECTIONS.md et la preview isolée si vérifiable ; sinon précise exactement la limite. Mets ton statut à ready_for_review seulement après publication du rapport et donne le SHA à Codex. Ne déclare pas la revue croisée terminée toi-même.
```

### Revendication du lot Char frontend par Claude — 29 octobre 2026

Lot revendiqué explicitement **avant toute édition**, au titre de l'affectation `p0-frontend-baseline / claude` qui inclut déjà « frontend Char sous apps/crm/bot/app/javascript et templates HTML/ERB nécessaires à ses globals ; apps/crm/bot/package.json uniquement pour les imports registry réparés ».

- branche : `fix/claude-frontend-baseline`, même worktree distinct
- périmètre mesuré avant édition : 5 307 fichiers suivis sous `apps/crm/bot/app/javascript` (1 246 `.vue`, 1 204 `.js`, 2 765 `.json`) ; **136 fichiers** portent la marque espacée dans un identifiant, **124** portent un identifiant à tiret
- chemin de contrôle : **extension de `scripts/check-frontend-p0.cjs`**, déjà en ma propriété, plutôt qu'un nouveau script — un seul contrôleur, enregistré ici avant édition. Aucun nouveau nom de fichier revendiqué.
- contrôles exécutés en **CI cloud** et non en local : l'installation locale du workspace a échoué de façon reproductible (voir CORRECTIONS.md), donc la preuve passe par le workflow.

Valeurs conservées sans exception, et contrôlées comme telles : noms de cookies persistants, valeurs de protocole et marqueurs, clés de dérivation, et **vrais noms registry** des paquets. Aucun catalogue régénéré, aucune fonctionnalité P1, aucune modification des sources backend Char (Ruby), des migrations ou des originaux `test-Crm`.

Convergence de jugement à consigner : la décision de Codex sur P0-SDK-002 de **rejeter les changements camelCase des valeurs** de constantes de protocole rejoint celle que j'ai prise sur `src/constants/ScrollBridgeProperties.ts`, où j'ai laissé `'__kovaa-labScrollRequest'` tel quel plutôt que de l'aligner sur les originaux. Même principe des deux côtés : une valeur de protocole se cite, elle ne se renomme pas.

Convention d'attribution, résolue par périmètre et sans contournement : `apps/crm/ui/AGENTS.md:56` interdit l'attribution IA dans les messages de commit, et mon rappel de harnais cède explicitement devant une instruction projet. Mes prochains commits touchant `apps/crm/ui/**` n'en porteront donc pas. `apps/crm/bot/AGENTS.md` ne porte pas cette règle, donc les commits Char la suivent par défaut. Les commits déjà publiés `7a9431428` et `90d5bc163` ne sont **pas réécrits**.

## Codex assignment — p0-frontend-baseline
- agent: codex
- status: in_progress
- branch: fix/codex-backend-build
- deliverables: vérifier les dépendances backend et la construction sur la base commune, relire les réparations Claude et corriger les défauts backend/infrastructure prouvés.
- owned files: scripts/, CI, packages backend/shared/client-sdk/emails nécessaires à la construction ; types partagés uniquement après coordination ; aucun fichier frontend détenu par Claude pendant son implémentation.
- acceptance criteria: SHA de base et SHA Claude examinés enregistrés ; contrôles significatifs reproduits ; compatibilités persistantes conservées ; correction ciblée des défauts démontrés ; rapport de revue partagé et résultat combiné honnête ; aucune revendication de validation globale sans exécution.
- verification report: CORRECTIONS.md, section p0-frontend-baseline / codex
- implementation revision: 39cda1cb700f0e1296ac4c7c3e1cf740a8ddd22f (SDK général réparé), PR #7 ; base c0318cf0b33134c4c292affe395009a6bd3b4662. Checkpoint runtime serveur ed80da151 inchangé, SDK général à vérifier dans la nouvelle chaîne.
- preview: dépend de la disponibilité du résultat combiné ; aucune vérifiée.
- blockers: P0-RUNTIME-001 vérifié ; CI backend 40979668149 et démarrage isolé dans CI 40979688501 verts, code ed80da151. Rapport partagé publié. Revue Claude du nouveau SHA et frontend combiné toujours attendus ; aucune preview intégrée.

Extension de propriété Codex, revendiquée avant édition : sources et configuration de construction du paquet `apps/crm/ui/packages/twenty-sdk`, dépendance commune révélée par la construction du renderer. Réparer les deux déclarations de type et le bandeau JavaScript généré invalides ; conserver les constantes de protocole SDK, les noms de paquets et les interfaces de données. Claude poursuit ses revues et le lot frontend Char ; pas d'édition concurrente du SDK.

## Évaluation et utilisation

Le prompt sépare propriété, dépendances et acceptation ; il vise une reprise de sources, sans nouvelle fonctionnalité. Utiliser les réglages habituels de Claude, sans paramètre API imposé. Vérifier cinq cas : identifiant illégal effectivement réparé ; import pointant vers un fichier réel ; valeur de protocole inchangée ; modifications originales toujours conservées ; build ou preview manquant explicitement signalé. Toute correction prouvée est ajoutée à CORRECTIONS.md avec son propriétaire et son SHA, sans effacer les constats précédents.

## Point de reprise de coordination — 29 octobre 2026

Dernier inventaire Claude relu par Codex : `71350185373ed7b8a57a15fc579a870a3fc19b6d` (PR #6). Les références plus anciennes ci-dessus sont historiques. Voir la section « Synchronisation Codex → Claude » de CORRECTIONS.md : mesures/local, icônes et contrat GraphQL sont tranchés ; aucun arbitrage P1, marque/police ou achat ne bloque la réparation P0. Claude doit publier son rapport partagé et réclamer sa propre affectation avant édition ; son statut pending n'est pas changé à sa place par Codex.

Extension de propriété autorisée pour `p0-frontend-baseline / claude` : nouveau contrôleur dédié `scripts/check-frontend-p0.cjs` et nouveau workflow `.github/workflows/p0-frontend-baseline.yml`, sans modifier les contrôleurs/workflows backend existants. Enregistrer leur usage lors de la prise de mission.

## Mission: Vérification combinée P0 — Codex

Mission ID: p0-combined-verification
- agent: codex
- status: in_progress
- branch: chore/p0-combined-verification
- base revision: fcd6c86f667b3da9c547dacb33ba8a890ba58c6c ; intégrer le checkpoint backend c13d12652959bb2903987c539359d9cbfe5f86fc sans réécriture.
- owned files: nouveau workflow CI combiné, documentation de vérification et configuration de preview isolée ; aucune source frontend détenue par Claude ni originaux test-Crm.
- deliverables: branche d'intégration séparée, vérification des SHA frontend livrés, construction combinée en ligne et preview Vercel si le bundle/configuration le permettent.
- acceptance criteria: aucune donnée/production/original modifié ; contrôles backend conservés ; réparations frontend relues sur SHA exact ; artefacts du build vérifiés ; limites de runtime et d'accès API explicitement distinguées ; rapports dans CORRECTIONS.md et docs/verification/p0-combined-codex.md.
- dependencies: livraison frontend Claude ; pas de doublon d'implémentation. Session frontend d'exécution réelle 8f3db32e, copie contextuelle de l'inventaire idle 0dd6de46, mise en route directe autorisée par le propriétaire.
- preview: non disponible à cette prise de mission ; accès Vercel CLI vérifié, aucun projet CRM P0 existant identifié dans l'équipe courante.
- blockers: frontend non livré à ce stade ; aucun backend de preview sans données n'est encore configuré. Un frontend statique seul ne sera pas présenté comme CRM opérationnel.
