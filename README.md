# Hermès CRM / KovaaLab CRM

Ce dépôt rassemble un CRM et trois applications clientes séparées. La branche de stabilisation est `chore/p0-stabilization` ; elle ne constitue pas encore une version applicative intégrée validée.

À chaque nouvelle mission, lire [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md) et [l'index de transmission](docs/handoff/README.md). Claude lit aussi [CLAUDE.md](CLAUDE.md). La mission frontend est publiée dans [l'issue #5](https://github.com/claude972/test-Crm/issues/5).

| Application | Sources | Stack |
| --- | --- | --- |
| CRM, API et worker | `apps/crm/ui` | React/Vite/Linaria, NestJS/TypeORM/GraphQL, Nx/Yarn |
| Char, conversations clients | `apps/crm/bot` | Rails/Vue |
| Forms, formulaires | `apps/crm/form` | Frontend et serveur dans un workspace pnpm |
| Cal.diy, rendez-vous | `apps/crm/calendar` | Import conservé localement, pas encore publié dans cette branche |

## État de la reprise

Les réparations backend, les chemins des workspaces, la bibliothèque UI manquante et les scripts locaux sont publiés. Des corrections frontend et l'import Cal.diy restent à reprendre. Les modifications locales d'origine sont préservées dans leur checkout et une sauvegarde privée des sources ; les configurations et données privées ne sont pas publiées.

Voir [l'état P0](docs/stabilization/p0-status.md), [les critères de livraison](docs/definition-of-done.md) et [le rapport Codex](docs/verification/p0-codex.md). La présence d'un service, d'un test ou d'un lien d'outil ne prouve pas son fonctionnement complet. Les applications gardent leurs authentifications ; SSO et synchronisations métier ne sont pas livrés par P0.

## Commandes locales

Les scripts CRM demandent Node.js 24.5 ou plus récent dans la branche 24. Docker Compose/Buildx est nécessaire aux services. Les commandes sont disponibles, mais l'installation et le build complet restent soumis aux vérifications P0 et aux réparations frontend restantes.

```sh
npm run setup       # crée les fichiers privés manquants sans remplacer les existants
npm run install:crm # installe le workspace apps/crm/ui depuis le lockfile
npm run build       # construit le CRM ; n'extrait plus les catalogues de traduction
npm run check       # contrôles TypeScript du serveur et du frontend
npm run status      # lit l'état des services locaux
```

`npm run init` applique les migrations existantes uniquement à la base locale attendue ; ne pas l'utiliser comme contrôle de lecture. `npm start` et `npm run stop` démarrent/arrêtent les services du workspace. Les scripts refusent de contrôler ces profils historiques depuis un worktree lié, car les bases, volumes et ports sont partagés. Utiliser le checkout principal ; une isolation dédiée est nécessaire avant tout démarrage concurrent.

Les modules disposent de `node scripts/customer-tools.mjs <action> <char|forms|calendar>`. Le script refuse de construire ou démarrer un module dont les sources sont absentes. Les sauvegardes de données via `npm run backup` exigent les services disponibles et contiennent des secrets : elles restent privées, hors Git.

Consulter [infra/README.md](infra/README.md) pour les ports et la configuration locale. Les déclarations historiques de ce guide ne remplacent pas les rapports de vérification de cette branche.
