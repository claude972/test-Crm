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
- status: ready_for_review — checkpoint courant `ff0d937c204a1374c91e1395d53481693b5655db`, PR #9. Contrainte web/PWA prise en compte ; CI combinée `40986681086` vérifiée en succès sur `c96b7eea6`.
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

## Mission p0-preview-session — preview web/PWA temporaire
- agent: codex
- status: ready_for_review
- branch: chore/p0-preview-session
- base revision: c96b7eea6cf316c0e1841f13b203e7731aaef4f1
- objective: livrer une preview Vercel avec API réelle isolée, PG/Redis jetables, durée bornée et protection d'origine ; aucun service/donnée de production, achat ou natif.
- owned files: workflow de session preview, scripts preview-* et rapport docs/verification/preview-* ; aucune source frontend métier.
- delegation: preview_hosting code gate/staging/routes ; backend_review code superviseur backend et worker ; root intègre/relit et code orchestration cloud. Revues croisées des helpers effectuées, trois corrections de lifecycle/contrat appliquées avant intégration.
- deliverables: build/artifact exact, session bornée, URL web/PWA protégée testée avec vrai backend, date d'expiration et limites explicites ; rapport partagé avant ready_for_review.
- blockers: aucun pour tester la preview CRM pendant sa session ; revue ciblée Claude en attente. Aucun serveur historique, secret original ou production existante utilisé.

- implementation revision: d1060f44e, PR #10, rapport publié dans CORRECTIONS.md avant ce statut.
- preview verified: https://hermes-crm-p0-preview-mjgvbtc3d-brafas-projects.vercel.app ; API expire 29 octobre 2026 à 22:55:40 America/Martinique.
- acceptance evidence: CI combinée 40986681086 verte ; API/config/PWA assets et onboarding/CRUD synthétique en ligne vérifiés, sources originales intactes.
- remaining review/limits: revue ciblée Claude de cette livraison demandée ; session temporaire, SSE/hors ligne/installation appareil non validés ; ce statut ne clôt pas les autres lots P0.


## Décision propriétaire — connecteurs Hermès à la place de Char

Le propriétaire demande WhatsApp via Evolution API, e-mail SMTP, réponses par un bot Hermès utilisant MCP, remontées de Forms et intégration Cal.diy (« cal.dly » interprété selon l'application déjà auditée). Char/Chatwoot sort de l'architecture cible ; ses sources et travaux historiques sont préservés. Les affectations Char précédentes restent un historique, pas une instruction de poursuivre son intégration dans le produit cible.

## Mission hermes-connectors-p1 — contrat et parcours intégrés
- common base revision: 0523dad07965bfb1c032729c00863e0940425e3f, à vérifier avant création des worktrees.
- prompt: docs/handoff/hermes-connectors-claude-prompt.md sur missions/p0-stabilization.
- agent: claude
- status: pending
- proposed implementation branch: feat/claude-hermes-connectors-ui ; ne pas dupliquer une branche ou affectation existante.
- owned files: frontend dans apps/crm/ui/packages/twenty-front et tests associés ; contrat partagé à convenir avant édition.
- deliverables: réglages des connexions, conversations WA/e-mail, contrôle du bot/reprise humaine, données Forms et rendez-vous dans les fiches clients ; états accessibles et responsive.
- agent: codex
- status: pending
- proposed implementation branch: feat/codex-hermes-connectors-api ; ne pas dupliquer une branche ou affectation existante.
- owned files: modules serveur/worker de apps/crm/ui/packages/twenty-server, adaptateurs, autorisations et stockage nécessaires ; reprise Cal.diy après audit ; CI/infrastructure de recette isolée.
- deliverables: contrat événements et connecteurs fonctionnels vérifiés, isolation workspace, déduplication, observabilité des erreurs/reprises et transports de recette.
- acceptance criteria: scénarios exacts du prompt, build vert, revue croisée par SHA et preview accessible au destinataire dans un navigateur sans session Vercel préalable.
- dependencies/open questions: service Hermès/MCP et moteur réellement disponibles à identifier ; accès Evolution et SMTP à fournir par gestionnaire de secrets ; canal de réception e-mail à décider si absent (SMTP ne le fournit pas) ; import Cal.diy non publié à reprendre après qualification des résultats de scan. Aucun secret demandé dans le chat ou dans le prompt.
- current delivery: prompt de mission préparé et publié ; aucune nouvelle intégration applicative implémentée par ce travail de rédaction.


## Mission hermes-redesign-p1 — refonte CRM parallèle aux connecteurs
- owner decision: demande explicite d'une refonte moderne, en parallèle de hermes-connectors-p1 ; remplace la conservation stricte de l'interface prévue dans le premier prompt.
- agent: claude
- status: pending
- implementation branch: même branche frontend feat/claude-hermes-connectors-ui après vérification/revendication, pas de branche concurrente sur les mêmes écrans.
- common base revision: 0523dad07965bfb1c032729c00863e0940425e3f, sous réserve d'une intégration plus récente annoncée et vérifiée.
- prompt: docs/handoff/hermes-redesign-claude-prompt.md sur missions/p0-stabilization.
- owned files: frontend twenty-front et tests ; extension aux tokens de twenty-ui/src/theme et composants partagés nécessaires, à déclarer avant modification. Aucun contrat partagé ni backend modifié sans coordination Codex.
- deliverables: audit des parcours/composants ; direction fondée sur la référence propriétaire ; refonte progressive navigation/liste/fiche client, conversations, pipeline, agenda/formulaires, réglages ; intégration aux contrats existants, pas de données de connexion inventées.
- acceptance criteria: DESIGN.md respecté ; amélioration métier vérifiable au-delà du thème ; composants/tokens cohérents ; chargement/vide/erreur/accessibilité et responsive ; build et preview destinataire testés ; captures avant/après et revue Codex par SHA exact.
- visual reference: Monday, choix explicite du propriétaire après présentation des captures ; référence dans le prompt dédiée. Dépendance de référence levée, thème clair de départ issu de la capture ; aucune nouvelle validation de style à redemander pour les détails conformes. Audit puis premier lot cadre/navigation/liste et fiche client autorisés, en parallèle du backend. Préserver le mécanisme sombre existant sans déclarer sa refonte achevée.
- parallelism: Codex garde le backend de hermes-connectors-p1 ; Claude coordonne refonte et fonctionnalités dans un seul chantier frontend. Les sous-agents n'éditent que des périmètres disjoints explicitement attribués.
- report: CORRECTIONS.md, section hermes-redesign-p1 ; aucune refonte implémentée ou validée à cette publication du cadrage.


## Exigence transversale propriétaire — tous les modules communiquent
- applies to: hermes-connectors-p1 et hermes-redesign-p1 ; ne réactive pas Char.
- contract document: docs/handoff/hermes-integration-contract.md.
- source of truth: identité et appartenance workspace du CRM ; correspondances externes par fournisseur/connexion, contrats API/événements, autorisations cohérentes sur chaque entrée et action MCP.
- codex ownership: concrétiser contrat typé et adaptateurs backend, persistance et correspondances, déduplication, erreurs/reprise et tests d'isolation.
- claude ownership: fiches et vues communes alimentées par ces contrats, actualisation visible, provenance et états de synchronisation ; même chantier frontend que la refonte Monday.
- acceptance: parcours intégré Forms -> contact -> conversation WhatsApp -> Hermès/MCP -> réservation Cal.diy -> chronologie/agenda/opportunité et e-mail SMTP ; réception e-mail distincte à configurer et valider avant revendication bidirectionnelle. Rejeu, retard, panne, reprise humaine et isolation entre workspaces vérifiés.
- delivery rule: preuve end-to-end sur services de recette réels et preview utilisateur ; mocks, services indisponibles et scénarios incomplets identifiés. Aucun module n'est déclaré connecté par sa seule configuration ou présence d'un lien.


## Exigence transversale — multi-structure cloisonné et dashboards
- owner decision: plusieurs sociétés exploitantes cloisonnées, dashboard par société et dashboard commun.
- access policy confirmed: « Chaque utilisateur voit un récapitulatif de ses sociétés autorisées ». Aucun accès global implicite, même depuis un filtre ou une URL ; droits métier appliqués aussi aux indicateurs.
- contract: docs/handoff/hermes-multi-structure-contract.md ; référencé dans les deux prompts et dans le contrat intermodules.
- applies to: hermes-connectors-p1 et hermes-redesign-p1 ; référence Monday conservée.
- codex ownership: audit workspace/adhésions/rôles existants, rattachement structure, contrat d'agrégation et autorisations serveur, connecteurs/événements/jobs/caches et tests d'isolation/révocation.
- claude ownership: sélecteur société/Toutes mes sociétés, contexte visible, dashboard société et commun ventilé, vues/états, isolation des requêtes et caches navigateur, même chantier frontend.
- acceptance: recette A/B/C et utilisateurs A, A+B, sans société ; rôles différenciés et révocation ; agrégats exacts, absence de fuite, parcours intermodules cloisonnés, droits sur fichiers/recherche/export/MCP, navigateur desktop/mobile.
- current limitation: la preview P0 était mono-workspace ; cette capacité n'est pas livrée par la seule présence du modèle Workspace ou de son drapeau. Spécification publiée, implémentation et preuves requises avant validation.


## Mission hermes-prospection-b2b-p1 — base clients, collectes et campagnes
- owner decision: base clients complète, réception du scraping Hermès, campagnes e-mail avec marqueur d'ouverture facultatif et désinscription ; audience confirmée « professionnels uniquement (B2B) ».
- specification: docs/handoff/hermes-prospection-b2b-spec.md ; référencée dans les prompts connecteurs et refonte.
- common requirements: sociétés cloisonnées, dashboards société/commun autorisés, Monday, web/PWA, modules interconnectés.

### Affectation Codex
- agent: codex
- status: pending
- branch: feat/codex-hermes-connectors-api après vérification/revendication, ou branche annoncée compatible sans édition concurrente.
- ownership: contrats de réception des lots et qualification, modèles CRM/provenance/exclusions, éligibilité B2B, queue/transport SMTP, désinscription et événements de suivi autorisés, agrégats et contrôle d'accès.
- deliverables: réutiliser le carnet CRM existant ; préserver les oppositions après réimport ; distinguer acceptation SMTP/livraison/ouverture ; endpoints publics limités et sécurisés ; tests d'isolation et de reprise.

### Affectation Claude
- agent: claude
- status: pending
- branch: même chantier frontend que refonte/connecteurs ; aucun deuxième écran concurrent.
- ownership: base clients et fiche, réception/qualification des collectes, assistant de campagne, suivi/exclusions/désinscriptions, dashboards et états accessibles Monday.
- deliverables: aperçu et mapping de lot, erreurs/doublons, audience/exclusions, modèle et aperçu e-mail, planification/pause, états de suivi prudents et preuve navigateur.

### Acceptation commune
- recette: lot avec doublon/erreur/contact existant/opposition, rejeu idempotent ; campagne sur comptes de test ; opposition en cours et après réimport respectée ; envoi sans suivi ; suivi autorisé/retrait ; panne/reprise sans doublon ; A/B/C et droits ; navigateur desktop/mobile.
- dependencies: schéma de sortie/transport Hermès à auditer ; connexion SMTP et destinataires de recette autorisés ; réception e-mail distincte ; justification et information de prospection/tracking ; juridiction France/UE prise comme hypothèse de cadrage à vérifier selon la cible réelle.
- limitation: spécification publiée, aucun scraping ou envoi réel lancé ; suivi des clics et séquences automatiques hors premier lot.


## Exécution de nuit autorisée — recette 30 octobre 2026 à 06:00 Martinique

Le propriétaire demande poursuite autonome jusqu'au lien de test, avec sous-agents Codex et Claude ; il sera indisponible. Conserver les limites d'accès/production et ne pas solliciter de décisions routinières. Aucun succès à06h n'est inventé si des accès externes manquent.

### Codex — intégration nuit
- agent: codex
- status: in_progress
- branch: feat/codex-hermes-integration, worktree p1-hermes-integration ; base0523dad07965bfb1c032729c00863e0940425e3f.
- ownership: intégration core-engine.module.ts, connexions/adaptateurs complémentaires non revendiqués, CI combinée et recette ; ne pas modifier les modules des sous-agents pendant leur travail.
- concrete contract: docs/handoff/hermes-structure-dashboard-api.md, structure=workspace existant, deux queries /metadata et agrégats autorisés. Code du sous-agent en cours, pas déjà livré.
- delegated backend_review: branche feat/p0-structure-dashboard-backend, module workspace/structure-dashboard et tests ; liste de sociétés + compteurs par société/ensemble, règles de lignes/rôles, IDs forgés/révocation.
- delegated prospection_api: nouveau worktree/branche à confirmer dans son rapport ; imports Hermès/qualification/provenance en réutilisant les campagnes et oppositions existantes, pas de duplication de leur modèle.
- delegated preview_hosting: branche chore/p0-morning-preview, extension session60/90min ; aucun service payant créé. Preview fraîche à préparer vers05:00–05:15, ancien lien P0 expirant22:55.
- blockers to audit: Evolution/Hermès/MCP et SMTP réels non configurés pour ce checkout ; pas d'accès inventé ni d'envoi réel. Services Railway existants non reliés à ce dépôt, aucune DB réutilisée.
- delivery: build, tests d'accès/données, refonte réellement visible et lien destinataire testé ; à06h rapport honnête sur réalisé/non configuré/non testé et expiration.

### Checkpoint Codex — 2026-10-30 03:28 UTC
- Branche publiée : feat/codex-hermes-integration, API câblées au schéma metadata dans bd69fca85 ; CI combinée [40997073360](https://github.com/claude972/test-Crm/actions/runs/40997073360) en cours, pas encore validée.
- Dashboard multi-structure : 16 tests unitaires réussis côté sous-agent. Imports B2B/qualification/oppositions/brouillons natifs : 26 tests réussis. SMTP réel Nodemailer sur serveur TCP loopback : 29 tests réussis côté sous-agent après correction des adresses multiples avant tout envoi. Aucun e-mail externe.
- Rejeu intégré des 71 tests : 70 réussis et 1 dépassement du timeout socket de 5s sur disque externe/cache froid ; contrôle en cours, ne pas annoncer cette exécution verte. Typecheck local complet interrompu après 26min sans résultat ; CI fait foi.
- Migration HermesImportState officielle 2.52 et recette PostgreSQL isolée en préparation ; le simple ajout du module ne constitue pas une migration appliquée.
- Contrat prospection concret : docs/handoff/hermes-prospection-backend-contract.md ; réception, qualification et brouillon DRAFT seulement, aucun envoi réel ni tracking activé.
- Claude réel 8f3db32e actif ; HEAD frontend705177d46 contient des briques de statut/contrats/cache, pas encore de refonte Monday visible. Revue et poursuite demandées, ne pas marquer frontend prêt.
- Préparation du matin : session GitHub Actions90min et nouvelle Vercel preview vers05h locale. Ancienne session P0 expirée. Le test final doit vérifier le lien de partage depuis un navigateur et l’authentification CRM.

### Recette unitaire et correctifs supplémentaires — 03:33 UTC
- Les **71/71 tests backend intégrés passent** après timeout réseau de fixture borné ; les 18 tests des garde-fous CI passent. SHA source de la CI actuelle afe9558d7721fa5d179ad21e4caeb2ff25def882, run [40997692482](https://github.com/claude972/test-Crm/actions/runs/40997692482), encore en cours.
- Génération officielle de migration ajoutée avant le smoke runtime, avec garde GitHub-hosted/p0_ci et reset de cette seule DB jetable. Télécharger/revoir/appliquer son patch généré, committer/recompiler puis vérifier via le registre officiel avant de déclarer les imports intégrés.
- Revue supplémentaire en cours : canonicalisation de l’adresse de désinscription d’un destinataire avec display-name (prospection_api) ; absence de relance automatique sur acceptation SMTP incertaine après DATA, chemin simple et batch (backend_review). Driver SMTP adapté par root après contrat.
- preview_hosting : adaptateur Evolution minimal réellement sondable, limité à configuration serveur par workspace et statut réel, sécurité SSRF/timeout. Aucun compte externe connecté par défaut.
- Aucun basculement de session multi-structure même origine sûr livré ; dashboard/filtre autorisé seulement. Le frontend ne doit pas présenter un faux changement de société pour les écritures CRM. Cookie partagé entre onglets : une vraie solution exige session native vérifiée et rejet des écritures sous contexte devenu différent.

### Checkpoint nuit — 04:10 UTC / 00:10 Martinique
- Branche intégration publiée601e76658, nouveau run [41001140809](https://github.com/claude972/test-Crm/actions/runs/41001140809) en cours. Les runs du chantier sont maintenant mis en file plutôt qu’annulés à chaque push.
- Run40999530431/source64fd5f28a : frontend compilé, **169 tests backend**, production typecheck et backend compile réussis. Bootstrap CLI a échoué sur FeatureFlagService absent du scope HermesProspectionModule. Import FeatureFlagModule corrigé dans22297b176 (inclus601e76658). Migration officielle et vrai runtime restent à prouver.
- Après correction du mock de navigation JSDOM par Claude, **23 tests frontend** passent localement ; **27 tests de garde CI** passent. Aucune preuve DB déduite de ces tests.
- UI réelle intégrée : tableau des sociétés autorisées, statut Evolution metadata, purge asynchrone de session attendue avec résultat explicite, navigation réglages. Refonte globale Hermès/Monday et réception imports restent en construction ; le tableau n’est pas un switch de session CRUD.
- Claude réel a lancé trois sous-agents general-purpose à03:50–03:52 UTC, en plus de deux explorations antérieures ; preuve par métadonnées de ses appels Agent, sans exposer sa conversation.
- Recettes réelles dashboard A/B/C et prospection/opposition native préparées (7 scénarios chacune), non exécutées avant migration officielle. Wrapper CI avant reset, accès services jetables uniquement.
- Revue indépendante prospection : états user/workspace invalides et rejeux DRAFT dont audience a changé reproduits. prospection_api corrige ; ne pas annoncer ce lot validé avant ses tests et intégration.
- Prochaines étapes : récupérer/appliquer/recompiler migration générée par CLI natif, vérifier via registre officiel, exécuter recettes et navigateur desktop/mobile. Nouveau lien de partage Vercel attendu au matin après recette, ancien backend expiré.


### Checkpoint nuit — 06:05 UTC / 02:05 Martinique
- Source intégration `7c2f4e3aa` puis checkpoint `52e7b6628` ; PR draft [11](https://github.com/claude972/test-Crm/pull/11). Rapport détaillé : docs/verification/hermes-night-20261030-0605utc.md sur feat/codex-hermes-integration.
- Frontend complet Claude intégré jusqu’à `dcf18cadd` : shell Hermès/Monday, dashboard, réception JSON/qualification/brouillon natif et navigation. Bundle source19576db92 compilé en ligne ; **82 tests frontend / 10 suites passent** après intégration des validations. PWA Hermès et icônes réelles ajoutées par Codex.
- **200 tests backend**, compilation/typecheck production passent. Migration officielle générée, revue, enregistrée puis réellement vérifiée en PostgreSQL CI : up/down/up, FK, concurrence/idempotence, isolation, persistance, stockage rollback et cascade réussis. **7 scénarios prospection HTTP/ORM passent** (A/B, contacts natifs, DRAFT sans livraison, opposition durable après réimport/révocation).
- Recette dashboard A/B/C : fixture FK corrigée puis dates inter-VM identifiées ; correctif98a3ebe9e transmet ISO sans modifier les assertions, attend confirmation CI. backend_review reste propriétaire de cette suite.
- Recette navigateur bloque avant UI au premier signup. preview_hosting investigue les diagnostics expurgés du run41010788330 ; sourcebb9fac8f2 aligne l’environnement HTTP sur CLI/preview sans toucher aux protections Auth. Ne pas annoncer la recette complète verte.
- Authentification de changement de workspace même origine non résolue : les filtres dashboards ne changent pas le contexte CRUD. Adaptateurs externes restent non configurés sans accès vérifié. Aucun e-mail externe, service payant ou production modifié.
- Prochain lien : nouvelle session90min vers05:00–05:15 Martinique, bundle exact, contrôle public puis partage privé Vercel et navigateur destinataire. Ancien lien expiré, aucun nouveau lien utilisable prétendu avant preuve.


### Checkpoint nuit — 06:24 UTC / 02:24 Martinique
- Root publié `8446b9db9`, Claude intégré jusqu’à `2a6310eb8`. **100 tests frontend / 12 suites passent réellement** après alignement DTO, staging brut et correction des cas d’erreur réels. Revue indépendante `docs/verification/hermes-frontend-contract-final-650640f22.md` : payloads/rejeu/sélections/DTO et conversion d’erreur natifs vérifiés sans DB ; dernière copie CONFLICT devenue neutre dans8446. Les préférences d’accueil natives restent respectées ; lien Dashboard permanent depuis les records, recette finale prévue sur/dashboard.
- Dashboard natif : les fixtures FK et dates passent désormais leur préparation ; un email dupliqué dans la même structure bloquait ensuite. Corrigé dansb442fef55 sans désactiver de contrainte ni changer les assertions. backend_review suit le run indépendant41013453457 (source650640f22) pour confirmer les 14 scénarios.
- Navigateur : cause FORBIDDEN identifiée dans la topologie CI cross-port. Correctifs4eee/33ba reproduisent l’origine commune Vercel via les22 ApiPath et alignent les URL publiques ; Auth/CORS/allowlist inchangés. preview_hosting suit41012486685 (source33ba) puis le dernier run complet. Tout succès navigateur reste à confirmer.
- Audit de livraison matin publié dans docs/verification/preview-morning-delivery-audit.md : SHA frontend et backend strictement identiques, durée90min à partir du gate, contrôle sous15min, partage privé borné par l’expiration API. Déclenchement à anticiper pour un gate vers09:15UTC/05:15Martinique ; aucun déploiement matin lancé prématurément.
- Limites externes inchangées : Evolution/SMTP/Hermès MCP/Forms/Cal.diy non configurés sans accès vérifié ; aucun message prospect, production ou nouveau service payant. Ancien lien expiré. Prochaine action : terminer CI native et navigateur, puis preview fraîche et vraie recette destinataire avant06h.


### Recette native acquise — 06:45 UTC / 02:45 Martinique
- [Run41013453457](https://github.com/claude972/test-Crm/actions/runs/41013453457), source650640f227ea7093573faae723504f9a56244725, **SUCCESS** : 14 scénarios natifs (7 dashboard A/B/C + 7 prospection),200 tests unitaires, typecheck/compilation backend, migration officielle et démarrage. Aucun scénario ignoré, assertion affaiblie ou contrainte désactivée. Preuve détaillée dans docs/verification/hermes-native-650640f22.md sur branche intégration.
- Navigateur : signup même origine fonctionne ; la recette échouait ensuite car le helper demandait displayName sur WorkspaceUrlsAndId. Champ retiré dans8e3b90659 après audit statique de10documents metadata, aucun changement Auth/UI. Nouvelle CI combinée41015984154 en cours, preview_hosting surveille la suite. Pas encore de succès navigateur ni de nouveau lien destinataire annoncé.
- Claude reste disponible sur les bogues UI réels ; frontend intégré2a6310eb8,100tests/12suites déjà passés. Aucun nouveau module non essentiel pendant la dernière recette. Session preview fraîche toujours prévue pour le matin avec SHA/bundle identiques et expiration réelle.


### Nouvelle autorisation — livraison 12h Martinique / 16:00UTC
- L’échéance de06h n’a pas été tenue : aucun lien de preview final vérifié remis. Le propriétaire a été informé honnêtement à07:52 et autorise maintenant poursuite autonome avec Codex/Claude jusqu’au test par lien, avec résultat attendu à12h. Ancien heartbeat06h supprimé ; nouveau `herm-s-construction-et-recette-12-h` actif jusqu’à16:15UTC, à supprimer après le compte rendu final.
- Un vrai défaut UI a été détecté après onboarding et login réussis dans41017644831 : IDs de traduction affichés à la place des libellés. Claude ed824dcc4 ajoute245messages àen/fr ; root725 reprend son correctif, puis9ce34b95b réconcilie réellement les catalogues via CLI Lingui extract/compile. Le vrai runtime Lingui confirme les quatre libellés auparavant défectueux en anglais/français ;5776 entrées par catalogue. Aucun garde ni assertion navigateur affaibli.
- Source candidate exacte `9ce34b95b43fadf195bb0be3cacf378fe116f35c`, CI combinée41052674485 en cours. Le testfe157 couvre maintenant la vraie route/dashboard Monday, ses six réponses natives, quatre compteurs DOM, puis/settings/structures et réception/qualification/DRAFT desktop/mobile. Aucun parcours complet déclaré vert avant preuve.
- Recette interne isolée lancée sur la même source : branchepreview/p0-session-20261030-internal-1206, run41052809170. Aucun lien utilisateur remis tant que deployment/control/API/navigation ne sont vérifiés. Ce créneau interne expirera avant12h : renouvellement frais90min impératif vers gate15:15UTC/11:15Martinique, avec partageprivé et expiration réelle, pour la remise de12h.
- Backend de production inchangé depuis650640f22, dont200tests et14scénarios natifs réels sont verts ; source originale et sauvegardes préservées. Externes non configurés sans accès prouvé, aucun message réel, production ou service payant ajouté.


### Recette interne réelle — 12:35 UTC / 08:35 Martinique
- Source9ce34b95b, runpreview41052809170 et Vercelpreviewdpl_AASJaddNFftZ1Lax9cgLDNMsLexN : setup/onboarding14étapes, partageTTLborné et cookiejar neuf sansloginVercel validés. L’API expire13:40UTC ; ce créneau ne sera pas présenté comme lien final de12h.
- Root a réellement navigué dans IAB : connexion normale, dashboard lisible, lot de3lignes (pending/invalid/duplicate), qualification d’un contact, brouillon DRAFT sans envoi ; retourdashboard Companies5→6 et People5→6. Vue autorisée/total6/6/6/0 ; PWAmanifeststandalone/icône192 vérifiés. Rapport détaillé en préparation docs/verification/hermes-browser-internal-41052809170.md.
- Défaut d’accessibilité confirmé : les deux radios étaient nommées Informationmethod viaField.Root ; la CI9ce échoue sur ce vrai problème après dashboard/structures/staging passés. CorrectifClaude8a9abe74b intégrérootb3eca2bc1, assertions conservées. Root a poursuivi la recette manuelle par texteDOM sans prétendre l’accessibilité valide.
- Mission frontendClaude actuelle : menuHermès/dashboard replié initialement sur mobile, bouton accessible ouvrir/fermer, liens conservés, desktop inchangé ; branding propre au shellHermès sans rebaptiser le framework. La capture390px montre que la navigation actuelle occupe presque le premier écran. Root coordonne le helperCI avecpreview_hosting après publication du composant.
- Après intégration/revue : nouvelle CI desktop/mobile, puis source gelée. Pour remise12h, session fraîche90min préparée vers15:00UTC pour gate15:15UTC/11:15Martinique, mêmeSHA frontend/backend et nouveau partageprivé réellement testé. Rien de sensible dansGit et aucune production modifiée.


## HERMES-V2-CADRAGE-20261030 — plan et prompt, aucune implémentation

Nouvelle instruction propriétaire : vérifier/créer les sociétés cloisonnées avec dashboard et connexions propres, compléter Prospection, proposer des maquettes avant câblage car le design actuel est rejeté, clarifier la langue, centraliser tous les réglages et ajouter de vrais interrupteurs des bots WhatsApp/e-mail par société. Cette instruction remplace les anciennes autorisations de poursuite autonome pour cette V2 : **audit, plan et prompt uniquement maintenant**.

- livrables de cadrage : docs/handoff/hermes-v2-plan-validation.md et docs/handoff/hermes-v2-prompt.xml ; skills make-plan et prompt-generator appliqués, split pour la répartition future.
- base commune auditée :333ba534927e177c90b35eb4157d75d8d767dec4 sur feat/codex-hermes-integration ; aucun branchement applicatif commencé pour cette V2.
- validations : périmètre/plan, langue (FR proposé, formulation anglaise à confirmer), référence visuelle, choix puis validation des maquettes et autorisation claire d'implémenter. Le design actuel/Monday n'est plus approuvé.
- source de vérité : centre Réglages unique, société active explicite ; vue commune de lecture seulement, jamais une cible de secrets/écritures.

### Affectation future Claude
- agent: claude
- status: pending
- branch: feat/claude-hermes-v2-ui — nom réservé, branche/worktree non créés.
- ownership: maquettes après validation du cadrage et référence ; puis frontend/tokens/localisation, uniquement après accord visuel et autorisation de coder. Frontend packages/twenty-front et composants UI dédiés.
- deliverables: trois pistes visuelles, maquettes desktop/mobile, parcours société/prospection/messagerie et centre Réglages ; aucun réglage dispersé dans les modules ; états honnêtes et langue validée.

### Affectation future Codex
- agent: codex
- status: pending
- branch: feat/codex-hermes-v2-core — nom réservé, branche/worktree non créés.
- ownership: contrats partagés, création/switch sécurisé de société, données/API, connexions chiffrées, politiques bots société/canal, prospection et CI/migrations ; packages/twenty-server, contrats twenty-shared et intégration à coordonner.
- deliverables: réutiliser auth/CRM/campagnes natifs ; vrai OFF bloquant MCP et auto sans couper réception/humain ; isolation A/B/C, révocation, onglets et métriques vérifiées.

### Statut réel de transmission et vérification
- Deux sous-agents Codex ont fait de la collecte factuelle en lecture seule ; aucune modification applicative, connexion externe, migration ou preview lancée pour cette demande.
- Le prompt est publié pour validation, **pas envoyé comme ordre d'implémenter** à Claude. Une publication de mission ne prouve pas le démarrage d'un agent.
- Le compte-rendu source et les critères détaillés sont dans le plan ; les nouveaux contrats restent à définir, ils ne sont pas présentés comme API déjà existantes.


### HERMES-V2 — préférences confirmées par le propriétaire
- Référence visuelle : Pipedrive. Langue par défaut : français. Ces deux choix sont acquis et ne doivent plus être redemandés.
- Plan et prompt mis à jour ; maquettes détaillées encore à valider avant câblage. Aucun nouveau développement, branche applicative, connexion externe ou déploiement lancé par cette mise à jour documentaire.


## HERMES-V2-MAQUETTES-20261030 — exécution du prompt autorisée

- owner authorization: « Ok agis en autonomie lance le prompt ». Plan approuvé ; Pipedrive et français acquis. Étape actuelle : produire des maquettes et contrats, PAS câbler l'application avant choix visuel.
- common base:333ba534927e177c90b35eb4157d75d8d767dec4. Original test-Crm, sauvegardes et branches précédentes préservés.
- shared brief: docs/handoff/hermes-v2-prompt.xml et hermes-v2-plan-validation.md sur cette branche ; sources visuelles officielles Pipedrive : https://support.pipedrive.com/fr/article/activites et https://www.pipedrive.com/fr/features/sales-dashboard.

### Claude — propriétaire exclusif du design
- agent: claude
- status: done
- assigned session:8f3db32e-4613-45e3-94f3-16e664f3cbfc ; ne pas lancer de doublon depuis une autre veille.
- branch: feat/claude-hermes-v2-ui ; worktree créé /Volumes/Stockage/dev/hermes-crm/v2-claude-maquettes (sparse docs uniquement).
- ownership: docs/design/hermes-v2/** uniquement ; aucune modification apps/, production, backend, compte ou connexion.
- deliverables: prototype statique HTML/CSS autonome proposant3pistes distinctes inspirées Pipedrive,4écrans par piste (dashboard, prospection, messagerie, Réglages société/connexions/bots), responsive390px etdesktop, contenu français, données fictives clairement marquées, aucune API. Noms/icônes/accessibilité cohérents ; un seul centre Réglages, pas d'interrupteur de configuration dans les modules.
- acceptance: images concrètes et maquettes navigables sans câblage ; captures desktop/mobile, provenance de références, codes/décisions design ; commit/push de la branche et rapport partagé. La validation des maquettes reste utilisateur.
- verification report: CORRECTIONS.md, section HERMES-V2-MAQUETTES-20261030/Claude ; Root reprend les captures et la revue.
- dispatch: prompt envoyé via session 2418, accepté par Claude à 17:48:31 UTC ; fichiers de prototype en cours dans le worktree attribué.

### Codex — contrats et vérification
- agent: codex
- status: done
- branch: feat/codex-hermes-v2-core ; worktree créé /Volumes/Stockage/dev/hermes-crm/v2-codex-contracts (sparse docs uniquement).
- ownership: docs/handoff/hermes-v2-settings-bots-contract.md et hermes-v2-company-prospection-contract.md ; root possède coordination et vérification des maquettes ; ne pas modifier les fichiers Claude.
- deliverables: contrats cible explicitement non implémentés, matrice des droits/scopes, vrai OFF par société/canal, sociétés/session/caches/onglets, données de prospection et recette ; chemins/signatures sources prouvés ; pas de fausse API existante.
- acceptance: isolation A/B/C et arrêt en vol décrits, aucune fuite de secret ni nouveau stockage/câblage réel, revue du prototype exact et images ; pas de test/app/deploy annoncé comme fait sans preuve.
- implementation revision: 1c6760cfc ; contrats publiés, revues Codex réciproques et revue Claude du final achevées (statique seulement).
- dependency: design validé avant code applicatif. Codex peut préparer les contrats sans modifier les fonctionnalités pendant les maquettes.

### Garde commune
- Les veilles lisent cette mission et n'en créent pas une copie. Pas de modification produit sous couvert d'autonomie avant validation visuelle. Maquettes = démonstration explicite, jamais faux fournisseur connecté.
- Aucun service payant nouveau, aucune production, aucun envoi réel ; preview statique de design permise sur projet existant, séparée d'une preview CRM fonctionnelle et sans secrets.

### Livraison de cette étape — validation visuelle utilisateur attendue
- Claude implementation revision: af8ce71e86ebfa03c07ee892bc782cbcdb53a249 ; onze fichiers statiques exclusivement docs/design/hermes-v2.
- Codex implementation revision: 1c6760cfc ; contrats proposés, aucune API V2 créée.
- verification report: docs/handoff/hermes-v2-maquettes-recette.md et CORRECTIONS.md section finale18:12UTC ; captures et JSON de preuves identifiés.
- preview: déploiement privé dpl_4NHEh9JihfYcRaNwtR1rj5FxLVZ8, lien complet uniquement chat ; maquettes et aucune API. Expiration31oct2026 14:07:35Martinique.
- status meaning: done concerne exclusivement production/revue des maquettes et contrats. Câblage applicatif non commencé ; aucune validation implicite du design. Attendre choix A/B/C puis maquettes détaillées validées avant implementation.
