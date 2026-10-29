# P0 — état de la stabilisation au 29 octobre 2026

## Portée de cette livraison

Première étape P0 : préserver les sources locales, publier les règles et une transmission exploitable, identifier le chemin d'exécution réel et retirer les affirmations de validation sans preuve. Cette étape ne valide pas les milliers de modifications locales et ne constitue pas une version prête à déployer.

## Git et conservation

- Dépôt : https://github.com/claude972/test-Crm
- Checkout local initial : branche `fix/crm-workspace-paths`, HEAD `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6`.
- Inventaire initial : 2 956 fichiers modifiés, un supprimé et huit entrées non suivies représentant 9 665 fichiers.
- Les changements couvrent notamment 2 328 fichiers CRM UI, 605 Char et 20 Forms ; Cal.diy est entièrement non suivi.
- Les sources locales sont conservées dans le checkout initial. Une sauvegarde privée hors dépôt contient les fichiers suivis et non ignorés, les empreintes SHA-256, les patches de travail/index et l'historique Git. Elle ne remplace pas une sauvegarde des bases ou des fichiers ignorés ; ceux-ci ne sont pas modifiés par cette mission.
- La branche `chore/p0-stabilization` est isolée dans un autre worktree. Aucun changement applicatif local non validé n'y est inclus.

## Sources d'exécution

Les scripts locaux examinés `scripts/build-crm.mjs` et `scripts/local-project.mjs` ciblent `apps/crm/ui`, puis `packages/twenty-server` et `packages/twenty-front` à l'intérieur de ce workspace. Ces scripts sont actuellement non suivis dans le checkout initial : ils ne sont pas disponibles dans cette livraison documentaire.

Le serveur racine `packages/twenty-server`, les services TypeScript à la racine et leurs anciens tests ne prouvent donc pas le fonctionnement du CRM démarré par ces scripts. Ne pas les supprimer avant inventaire des usages ; ne pas y développer les nouvelles intégrations par défaut.

Applications distinctes : CRM React/Vite/Linaria + NestJS/TypeORM/GraphQL ; Char Rails/Vue ; Forms frontend et serveur séparés ; Cal.diy Next.js/Prisma/tRPC. Ne pas migrer ces stacks pour les uniformiser.

## Écarts documentaires confirmés

La documentation historique annonçait des validations globales sans preuves reproductibles jointes. Des méthodes des services de réservation à la racine sont vides ; le test `packages/twenty-server/src/__tests__/calendar.test.ts` examiné n'appelle pas le service. Cela ne permet pas de conclure sur la qualité de tous les tests des applications importées.

Dans les modifications locales examinées, Outils clients ouvre des liens vers Char, Forms et Cal.diy. Le guide local indique des authentifications indépendantes, sans SSO ni synchronisation des contacts/réponses/réservations. Aucun de ces flux n'est validé ici.

## Étapes restantes pour terminer P0

1. Comparer les réparations Char à `fix/char-identifiers` sans modifier ce worktree actif ; sélectionner et vérifier les changements cohérents.
2. Valider les chemins, manifests, dépendances partagées et scripts CRM, en séparant les catalogues générés des réparations de sources.
3. Auditer l'import Cal.diy, sa provenance/licence et ses fichiers candidats avant publication. Contrôler les secrets sur chaque lot.
4. Publier des commits applicatifs ciblés, avec checks adaptés et résultats traçables ; conserver les travaux non validés dans le checkout initial et la sauvegarde privée.
5. Établir le nouveau commit de base commun après intégration. La base historique actuelle ne contient pas les intégrations locales et n'est pas certifiée reproductible.
6. Définir et vérifier une preview isolée. Aucun déploiement de production n'est autorisé par ce chantier.

## Contrat à préparer en P1

Proposition, pas une API existante : état d'intégration par workspace avec identifiant d'outil, configuration, disponibilité (`unknown`, `available`, `unavailable`), autorisation, date de contrôle et erreur affichable. Aucun secret côté navigateur. Le serveur impose les droits et l'isolation ; Claude n'invente pas un contrôle de santé navigateur ou un faux état connecté.
