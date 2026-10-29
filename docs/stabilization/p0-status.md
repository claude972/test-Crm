# P0 — état de la stabilisation au 29 octobre 2026

## Portée de cette livraison

La reprise backend et système a commencé par lots vérifiés. Les contrôles portent sur la syntaxe, les imports internes, des compatibilités ciblées et les limites de configuration. Le frontend, les constructions intégrées et Cal.diy restent à terminer ; cette branche ne constitue pas une version prête à déployer.

## Git et conservation

- Dépôt : https://github.com/claude972/test-Crm
- Checkout local initial : branche `fix/crm-workspace-paths`, HEAD `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6`.
- Inventaire initial : 2 956 fichiers modifiés, un supprimé et huit entrées non suivies représentant 9 665 fichiers.
- Les changements couvrent notamment 2 328 fichiers CRM UI, 605 Char et 20 Forms ; Cal.diy est entièrement non suivi.
- Les sources locales sont conservées dans le checkout initial. Une sauvegarde privée hors dépôt contient les fichiers suivis et non ignorés, les empreintes SHA-256, les patches de travail/index et l'historique Git. Elle ne remplace pas une sauvegarde des bases ou des fichiers ignorés ; ceux-ci ne sont pas modifiés par cette mission.
- La branche `chore/p0-stabilization` est isolée dans un autre worktree. Seuls les lots examinés y sont repris ; les différences locales restantes sont conservées dans le checkout initial.

## Sources d'exécution

Les scripts locaux examinés `scripts/build-crm.mjs` et `scripts/local-project.mjs` ciblent `apps/crm/ui`, puis `packages/twenty-server` et `packages/twenty-front` à l'intérieur de ce workspace. Ils sont maintenant publiés dans la branche P0, avec des contrôles de conservation des configurations et de refus des cibles de migration distantes ou incorrectes. Le checkpoint 89ab4e8b1 passe les cinq jobs de CI, y compris le build shared et ses déclarations (exécution 40969724576).

Le serveur racine `packages/twenty-server`, les services TypeScript à la racine et leurs anciens tests ne prouvent donc pas le fonctionnement du CRM démarré par ces scripts. Ne pas les supprimer avant inventaire des usages ; ne pas y développer les nouvelles intégrations par défaut.

Applications distinctes : CRM React/Vite/Linaria + NestJS/TypeORM/GraphQL ; Char Rails/Vue ; Forms frontend et serveur séparés ; Cal.diy Next.js/Prisma/tRPC. Ne pas migrer ces stacks pour les uniformiser.

## Écarts documentaires confirmés

La documentation historique annonçait des validations globales sans preuves reproductibles jointes. Des méthodes des services de réservation à la racine sont vides ; le test `packages/twenty-server/src/__tests__/calendar.test.ts` examiné n'appelle pas le service. Cela ne permet pas de conclure sur la qualité de tous les tests des applications importées.

Dans les modifications locales examinées, Outils clients ouvre des liens vers Char, Forms et Cal.diy. Le guide local indique des authentifications indépendantes, sans SSO ni synchronisation des contacts/réponses/réservations. Aucun de ces flux n'est validé ici.

## Lots publiés et vérifications

- Forms : 19 fichiers d'identifiants JS/TS/HTML repris ; la dérivation des clés reste inchangée. Contrôles de syntaxe de 839 sources TS, deux bootstraps HTML exécutés, déchiffrement d'un ancien format et rejets mauvaise clé/altération. Une comparaison avec le code local non publié confirme l'incompatibilité du renommage de dérivation écarté.
- Char : 334 fichiers backend dont les modifications sont limitées aux identifiants techniques et espaces de fin de ligne. Le nom de cookie de session existant est conservé. Compilation sans exécution de 3 369 sources Ruby/Rake/Jbuilder sous Ruby 3.4.4 sur GitHub Actions.
- CRM backend/shared : identifiants et chemins rétablis ; 13 954 sources TS analysées et 50 293 imports internes résolus. Marqueur de réponse SDK historique conservé et vérifié. Une ancienne déclaration de test référençant un service absent et inutilisé a été retirée.
- Workspace : 18 dossiers de paquets présents et 23 références workspace résolues ; bibliothèque UI locale importée avec sa licence et son fichier de provenance. Lockfile Yarn 4 publié ; installation immuable et build shared contrôlés séparément par la CI, sans les assimiler aux contrôles de syntaxe.
- Exploitation : scripts locaux et Compose publiés ; configuration setup idempotente et permissions 0600 vérifiées dans un répertoire temporaire ; trois cibles de migration incorrectes rejetées avant tout lancement Docker. Compose validé sans démarrage. Le build ne lance plus automatiquement `lingui extract`. Les commandes de contrôle des services et la sauvegarde refusent les worktrees liés tant que les profils historiques ne sont pas isolés.
- Chaque lot préparé passe Gitleaks avec sorties expurgées ; aucune détection dans les sources publiées. Une clé factice de test avait déclenché un faux positif et a été remplacée par une clé aléatoire éphémère ; ce n'était pas un secret d'accès.

Les résultats en ligne et les SHA précis sont consignés dans docs/verification/p0-codex.md. Les contrôles de syntaxe/imports ne constituent pas un typecheck complet, un démarrage ou une validation métier.

## Étapes restantes pour terminer P0

1. Terminer et relire l'inventaire frontend réel par Claude, puis reprendre les réparations frontend de syntaxe/chemins et les outils clients sans refonte visuelle ni ajout P1.
2. Terminer la vérification d'installation immuable, des constructions et des types sur les sources publiées ; corriger tout échec avec des commits ciblés.
3. Auditer l'import Cal.diy, sa provenance/licence et ses fichiers candidats avant publication. Les sources restent conservées localement et dans la sauvegarde privée ; ne pas publier des configurations privées ou des résultats de scan bruts.
4. Reprendre les changements restants Char/frontend et exclure les modifications de formats ou clés persistants non justifiées. Les catalogues de traduction régénérés restent hors des commits de reprise.
5. Effectuer la revue croisée des SHA livrés, intégrer les corrections puis convenir d'un nouveau commit de base commun. L'historique initial est conservé.
6. Définir et vérifier une preview isolée une fois la construction et la configuration intégrées disponibles. Aucun déploiement de production ni démarrage des volumes existants n'a été effectué pendant cette reprise.

## Coordination Claude

La première session Claude Code avait été lancée dans le worktree `claude-frontend-inventory`, branche `chore/claude-frontend-inventory`, base `2bd457eccbb3fbde1a48358be98ce768b0bd5470`, puis avait actualisé son checkout à bb1108377 avant interruption. À la reprise, une autre session Claude déjà active sur la mission #5 a été détectée ; la relance de l'ancien contexte a été arrêtée pour éviter un doublon. Le rapport est désormais livré dans la PR #6, SHA 1501776ca799b8ce1720fc330ff04dbf00598b39. Les constats P0 ont été reproduits et des précisions documentaires demandées ; la revue globale reste ouverte.

La coordination partagée courante est `missions/p0-stabilization`, fichiers racine MISSIONS.md et CORRECTIONS.md. Les documents sous docs/handoff conservent les consignes détaillées. Lire le remote et vérifier les prises en charge avant toute nouvelle session. Une nouvelle comparaison de la sauvegarde après interruption confirme 55 696 fichiers d'origine inchangés, sans aucun fichier manquant.

## Contrat à préparer en P1

Proposition, pas une API existante : état d'intégration par workspace avec identifiant d'outil, configuration, disponibilité (`unknown`, `available`, `unavailable`), autorisation, date de contrôle et erreur affichable. Aucun secret côté navigateur. Le serveur impose les droits et l'isolation ; Claude n'invente pas un contrôle de santé navigateur ou un faux état connecté.
