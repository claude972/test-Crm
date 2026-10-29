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
- status: pending
- branch: fix/claude-frontend-baseline
- deliverables: réparations frontend de syntaxe et chemins en commits ciblés, contrôles pertinents et rapport partagé.
- owned files: apps/crm/ui/packages/twenty-front et twenty-front-component-renderer ; frontend Char sous apps/crm/bot/app/javascript et templates HTML/ERB nécessaires à ses globals ; apps/crm/bot/package.json uniquement pour les imports registry réparés. Ne pas toucher aux sources backend, types shared, migrations, lockfile CRM, bibliothèque UI importée ou scripts de Codex sans coordination.
- acceptance criteria: lire AGENTS.md/DESIGN.md et les consignes proches ; inspecter les sources et l'interface disponible ; reprendre uniquement les changements compris et vérifier les dépendances correspondantes ; aucune nouvelle direction visuelle ; sources TS/JS/Vue réparées, absence d'identifiants illégaux démontrée par contrôles adaptés ; build/typecheck ou limites précisément consignés ; originaux conservés ; aucun secret ; commits poussés ; preview Vercel isolée vérifiée si le bundle et la configuration permettent de la produire, sinon blocage explicite ; revue Codex du SHA exact requise.
- verification report: CORRECTIONS.md, section p0-frontend-baseline / claude ; conserver aussi un rapport docs/verification/frontend-baseline-claude.md.
- implementation revision: aucun commit pour cette mission à ce stade.
- preview: aucune à ce stade ; ne pas utiliser la production comme preview.
- blockers: inventaire livré dans PR #6, SHA 1501776ca799b8ce1720fc330ff04dbf00598b39 ; précisions P0-DOC-001 à 003 à traiter et rapport partagé à publier. Codex confirme la base c0318cf0b33134c4c292affe395009a6bd3b4662 et les décisions techniques de CORRECTIONS.md ; aucun choix de marque/police n'est requis pour cette réparation P0.

### Prompt de démarrage Claude

```text
Tu prends la mission p0-frontend-baseline uniquement après avoir livré l'inventaire #5. Lis les fichiers MISSIONS.md et CORRECTIONS.md sur origin/missions/p0-stabilization, confirme ton affectation et vérifie qu'aucun autre agent ne l'a prise. Crée ta branche fix/claude-frontend-baseline dans un worktree distinct, sur le commit commun résolu et consigné avec Codex. Lis les règles et les sources existantes. Compare les réparations locales en lecture seule ; ne copie pas aveuglément tous les changements et ne publie pas les catalogues régénérés. Corrige uniquement les identifiants JS/TS/Vue invalides et les chemins nécessaires au frontend constructible, sans refaire le design ni ajouter P1. Conserve les protocoles et les valeurs persistantes. Coordonne les fichiers partagés avant toute édition. Vérifie syntaxe, imports, types/build selon les dépendances réellement disponibles. Publie les commits, une PR brouillon vers chore/p0-stabilization, le rapport dans CORRECTIONS.md et la preview isolée si vérifiable ; sinon précise exactement la limite. Mets ton statut à ready_for_review seulement après publication du rapport et donne le SHA à Codex. Ne déclare pas la revue croisée terminée toi-même.
```

## Codex assignment — p0-frontend-baseline
- agent: codex
- status: in_progress
- branch: fix/codex-backend-build
- deliverables: vérifier les dépendances backend et la construction sur la base commune, relire les réparations Claude et corriger les défauts backend/infrastructure prouvés.
- owned files: scripts/, CI, packages backend/shared/client-sdk/emails nécessaires à la construction ; types partagés uniquement après coordination ; aucun fichier frontend détenu par Claude pendant son implémentation.
- acceptance criteria: SHA de base et SHA Claude examinés enregistrés ; contrôles significatifs reproduits ; compatibilités persistantes conservées ; correction ciblée des défauts démontrés ; rapport de revue partagé et résultat combiné honnête ; aucune revendication de validation globale sans exécution.
- verification report: CORRECTIONS.md, section p0-frontend-baseline / codex
- implementation revision: 79305ae2e63e72456e3c5b78ae5ced483d951557 ; PR #7, base c0318cf0b33134c4c292affe395009a6bd3b4662.
- preview: dépend de la disponibilité du résultat combiné ; aucune vérifiée.
- blockers: contrôle final backend en cours dans CI 40972089496 après correction P0-TYPES-001 ; 19 tests SDK et constructions des dépendances déjà vérifiés dans CI 40971268236. La vérification combinée attend le SHA frontend Claude prêt à relire.

## Évaluation et utilisation

Le prompt sépare propriété, dépendances et acceptation ; il vise une reprise de sources, sans nouvelle fonctionnalité. Utiliser les réglages habituels de Claude, sans paramètre API imposé. Vérifier cinq cas : identifiant illégal effectivement réparé ; import pointant vers un fichier réel ; valeur de protocole inchangée ; modifications originales toujours conservées ; build ou preview manquant explicitement signalé. Toute correction prouvée est ajoutée à CORRECTIONS.md avec son propriétaire et son SHA, sans effacer les constats précédents.
