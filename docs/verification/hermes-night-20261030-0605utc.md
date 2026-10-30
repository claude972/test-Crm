# Hermès — checkpoint 30 octobre 2026, 06:05 UTC / 02:05 Martinique

Source intégration : `7c2f4e3aa` sur `feat/codex-hermes-integration`. Ce checkpoint ne constitue pas la recette finale de 06:00 Martinique.

## Vérifié

- Le bundle frontend complet Hermès (dashboard, réception/qualification, navigation entre modules, icônes PWA) compile dans le run [41008938547](https://github.com/claude972/test-Crm/actions/runs/41008938547), source `19576db92`.
- Dix suites frontend réellement exécutées après intégration du commit Claude `dcf18cadd` : **82 tests réussis**. Les cas couvrent notamment sélection des lignes, refus d’une méthode d’information absente, URL d’information avec identifiants refusée, limites de noms/payload et distinction des conflits. Le workflow exécute maintenant ces dix suites.
- Le run backend indépendant [41010788365](https://github.com/claude972/test-Crm/actions/runs/41010788365), source `1e4b2a292`, valide **200 tests unitaires**, le typecheck et la compilation backend. Il reste rouge sur la fixture dashboard décrite ci-dessous.
- La vérification officielle de migration du run [41007270748](https://github.com/claude972/test-Crm/actions/runs/41007270748), source `c6b76b237`, est réussie sur PostgreSQL jetable GitHub Actions. Son artefact `hermes-migration-c6b76b2377ac7b4a376d53fd82bb1e2fb864b4c2/report.json` atteste : migration up/down/up, FK, fixture workspace/application native, rejeux et imports concurrents, persistance, isolation, rollback de la limite de stockage, frontière d’accès et cascade. Base jetable réinitialisée après contrôle.
- Les **7 scénarios prospection réels HTTP/ORM passent** dans les runs 41007270748 et 41010788365 : isolation A/B, qualification de contacts natifs, idempotence, brouillon sans livraison et opposition durable après réimport/révocation. Aucun envoi à un prospect.

## Toujours à vérifier

- Les 7 scénarios dashboard sont bloqués lors de la préparation : la FK workspace/application a été corrigée, puis un objet Date traversant la frontière VM Jest n’était plus reconnu par le formateur ORM natif. Le correctif `98a3ebe9e` transmet des chaînes ISO sans changer bornes ni assertions ; confirmation PostgreSQL à la prochaine CI.
- Le smoke navigateur complet échoue avant l’UI au premier signup. Les diagnostics GraphQL expurgés sont maintenant conservés ; investigation en cours, sans contournement de l’authentification. `bb9fac8f2` aligne la source de configuration du serveur HTTP de recette sur celle du CLI et de la preview (`IS_CONFIG_VARIABLES_IN_DB_ENABLED=false`). Ce n’est pas encore une cause prouvée.
- Le lien P0 ancien a expiré. Aucune nouvelle URL ne doit être présentée comme utilisable avant déploiement du bundle exact, contrôle public, partage privé et test navigateur sans connexion Vercel préalable. Session fraîche de 90 minutes prévue vers 05:00–05:15 Martinique.

## Limites conservées

Web/PWA uniquement. Dashboard commun limité aux sociétés autorisées ; son filtre ne change pas le contexte CRUD. SMTP/Evolution/Hermès MCP/Forms/Cal.diy restent non configurés sans accès vérifié. Les campagnes restent des brouillons ; aucune réception SMTP réelle, livraison, ouverture ou automatisation externe n’est déclarée fonctionnelle sans preuve. Dépôt original et sauvegardes préservés.
