# Décisions techniques

## État confirmé par inspection P0

- Conserver les stacks existantes ; le CRM importé utilise React/Vite/Linaria, NestJS/TypeORM/GraphQL et Nx/Yarn.
- Les scripts locaux examinés ciblent le workspace `apps/crm/ui` ; le serveur racine reste à inventorier et n'est pas supprimé.
- Char, Forms et Cal.diy sont des applications distinctes. Les outils clients locaux fournissent une navigation, pas une synchronisation métier ni un SSO.
- GitHub sert de transmission entre missions, via AGENTS.md, CLAUDE.md et docs/handoff/README.md. La publication ne démarre pas automatiquement un agent.
- Utiliser des worktrees séparés et une revue croisée sur commits exacts.

## Affirmations historiques à ne pas reprendre comme preuves

La description uniforme « frontend Next.js » et « TypeORM + Prisma pour les migrations du CRM » ne reflète pas la séparation des applications observée. Confirmer chaque outil de migration dans son application avant intervention.

La configuration de CI, les previews et la reproductibilité complète restent à vérifier ; leur simple mention dans la documentation n'atteste pas leur fonctionnement.
