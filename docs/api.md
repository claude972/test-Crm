# API — état de vérification

Le CRM actif visé par les scripts locaux utilise le serveur NestJS/GraphQL de `apps/crm/ui/packages/twenty-server`. Les autres applications disposent de leurs propres API et authentifications.

La liste historique `/api/boite`, `/api/calendrier`, `/api/formulaire`, `/api/bot`, `/api/ui` ne constitue pas une spécification vérifiée de routes fonctionnelles. Les affirmations globales JWT et stockage S3 doivent être confirmées pour chaque application et configuration.

Avant toute intégration, relever les contrôleurs/resolvers réellement chargés, leur contexte d'authentification et leurs permissions. Définir ensuite un contrat versionné : données, erreurs, ownership par workspace, signature des webhooks et idempotence.

Le contrat de statut des outils P1 reste une proposition décrite dans [P0](stabilization/p0-status.md), pas une API livrée.
