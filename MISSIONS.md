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
- blockers: session précédente interrompue avant livraison ; reprise du contexte existant requise.

## Codex assignment
- agent: codex
- status: in_progress
- branch: chore/p0-stabilization
- deliverables: sauvegarde privée vérifiée, réparations backend/systeme ciblées, CI significative, état réel et corrections des échecs.
- owned files: apps/crm/ui/packages/twenty-server, twenty-shared, marqueur SDK partagé, scripts/, infra/, configuration/lockfiles et documentation de coordination ; réparations backend Char et identifiants Forms déjà publiés.
- acceptance criteria: originaux inchangés ; secrets non publiés ; identifiants et imports réparés ; compatibilités persistantes conservées ; contrôles en ligne avec artefacts vérifiés ; revue croisée et limites explicites ; preview combinée seulement si réellement disponible.
- verification report: CORRECTIONS.md, section p0-stabilization / codex
- implementation revision: bb11083776b05f4998d6ddc1a5f15e2deb16539e
- preview: aucune vérifiée ; build intégré non validé.
- blockers: CI 40963891231 échoue sur l'absence d'artefacts shared ; frontend et Cal.diy restent à reprendre ; revue croisée incomplète.

## Cross-verification

Claude examine les commits Codex désignés et consigne ses constats ; Codex relit le rapport/frontend de Claude sur son SHA exact. CORRECTIONS.md vide à sa création ne signifie pas absence de défaut. Les missions restent in_progress tant que les corrections, vérifications et limites applicables ne sont pas résolues.
