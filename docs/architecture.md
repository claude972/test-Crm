# Architecture — état observé

Le projet rassemble quatre applications indépendantes :

| Application | Sources | Stack principale |
| --- | --- | --- |
| CRM, API et worker | apps/crm/ui | React/Vite/Linaria, NestJS, TypeORM, GraphQL, PostgreSQL/Redis, Nx/Yarn |
| Char | apps/crm/bot | Rails/Vue, issu de Chatwoot |
| Forms | apps/crm/form | Workspace pnpm, frontend et serveur séparés |
| Cal.diy | apps/crm/calendar | Next.js, Prisma, tRPC ; import encore local non suivi à l'inventaire P0 |

Les scripts locaux examinés ciblent le CRM sous `apps/crm/ui`. Le serveur racine `packages/twenty-server` et les ébauches à la racine doivent être inventoriés avant toute suppression ; ils ne sont pas le backend ciblé par ces scripts.

L'intégration Outils clients et ses configurations existent dans les changements locaux non publiés. Elles ouvrent les applications dans des onglets séparés ; une URL ne prouve pas la disponibilité d'un service. SSO et synchronisation interapplications restent des chantiers à concevoir et vérifier.

Voir [les limites de la base publiée](stabilization/p0-status.md) avant de lancer ou modifier le projet.
