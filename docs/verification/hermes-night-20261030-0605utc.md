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
- Le smoke navigateur complet échouait avant l’UI au premier signup : les diagnostics expurgés confirment `FORBIDDEN`, origine interdite pour un cookie de session. La topologie CI utilisait frontend3001/API3000, alors que le déploiement Vercel fonctionne sous une origine commune. En production, le validateur natif exclut les origines loopback dérivées de son allowlist. `4eee270bd` reproduit donc les 22 routes ApiPath sous un proxy Vite de même origine, Host canonique conservé ; `33ba8ced6` aligne aussi les URL publiques et vérifie les workspaceUrls natifs. Aucun guard Auth/CORS ou allowlist modifié. La configuration HTTP reste explicitement issue de l’environnement (`bb9fac8f2`). Validation navigateur réelle de ces correctifs encore attendue.
- Le lien P0 ancien a expiré. Aucune nouvelle URL ne doit être présentée comme utilisable avant déploiement du bundle exact, contrôle public, partage privé et test navigateur sans connexion Vercel préalable. Session fraîche de 90 minutes prévue vers 05:00–05:15 Martinique.

## Limites conservées

Web/PWA uniquement. Dashboard commun limité aux sociétés autorisées ; son filtre ne change pas le contexte CRUD. SMTP/Evolution/Hermès MCP/Forms/Cal.diy restent non configurés sans accès vérifié. Les campagnes restent des brouillons ; aucune réception SMTP réelle, livraison, ouverture ou automatisation externe n’est déclarée fonctionnelle sans preuve. Dépôt original et sauvegardes préservés.


## Complément 06:20 UTC / 02:20 Martinique

La source `650640f22` intègre les correctifs Claude jusqu’à `e06521999` : sujet200, téléphone40, réception brute des sociétés vides, conflits génériques décrits sans cause inventée, union des colonnes dashboard et accès permanent à son lien depuis le CRM. Les douze suites frontend ont été réellement rejouées : **100/100 tests réussis**. Une ancienne assertion contraire au staging brut a échoué avant d’être corrigée ; aucun succès n’est attribué à cette exécution intermédiaire.

Le run backend `41011984357` a dépassé les fixtures FK et dates, mais a ensuite identifié des emails identiques entre plusieurs personnes d’une même structure. Le correctif `b442fef55` génère des emails uniques par personne tout en conservant les contacts identiques entre structures pour la preuve d’isolation. Aucun index ou contrôle n’a été désactivé ; quantités et assertions restent inchangées. Les sept scénarios dashboard restent à confirmer dans la prochaine CI.
