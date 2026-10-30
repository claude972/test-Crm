# Vérification combinée P0 — Codex

Branche isolée : `chore/p0-combined-verification`, base `fcd6c86f667b3da9c547dacb33ba8a890ba58c6c`. Checkpoint backend `c13d12652959bb2903987c539359d9cbfe5f86fc` intégré par merge sans réécriture ; code backend vérifié précédemment sur `79305ae2e63e72456e3c5b78ae5ced483d951557`.

## Préparation

Les workflows existants sont rendus réutilisables via `workflow_call`. Le nouveau workflow `p0-combined.yml` relance les contrôles de sources et backend sur le même checkout d'intégration. Aucun résultat frontend ni global n'est déduit de ces seuls jobs ; le workflow frontend de Claude et sa révision seront intégrés après livraison et revue.

Accès Vercel CLI vérifié ; aucun projet CRM P0 existant identifié dans l'équipe courante. Une preview isolée dépend encore d'un bundle effectivement construit et d'une configuration sans secrets/données de production. Un frontend statique sans API ne prouvera pas le fonctionnement connecté du CRM. Aucun serveur, base, worker ou volume existant démarré. Les originaux restent en lecture seule.

## Résultats

En attente de la livraison frontend. Ce document ne constitue pas une validation globale, fonctionnelle ou visuelle.

## Conservation des originaux

Recontrôle SHA-256 depuis le manifeste privé de sauvegarde, après création de la branche d'intégration : 55 696 fichiers contrôlés, zéro différent, zéro manquant. La sauvegarde et son manifeste restent privés et ne sont pas publiés.

## Contrôles de cette préparation

`git diff --check` réussi ; Gitleaks sur les changements staged sans détection. Première CI combinée : https://github.com/claude972/test-Crm/actions/runs/40977970048 **réussie** sur `fe16ff92d` : six jobs verts. Le commit `0f0e6b3fb` ne change ensuite que la documentation. Cette CI couvre Forms, compilation syntaxique Ruby, syntaxe/imports CRM, orchestration sûre, shared runtime/déclarations et checkpoint backend (SDK/e-mails/types/compilation/artefacts). Elle ne couvre pas encore le frontend.

## Contrôle de démarrage isolé — en cours

Commit f7f05f90b : le workflow backend réutilisable accepte désormais une option runtime-smoke, activée seulement dans la vérification combinée. PostgreSQL 16 et Redis 7 sont créés dans le runner GitHub Actions avec base p0_ci et port loopback ; aucun service ou volume local n'est utilisé. La clé d'application est aléatoire et éphémère. Le helper refuse hors GitHub Actions, vérifie les cibles loopback et l'absence de .env privé avant toute opération.

Le contrôle initialise uniquement cette base jetable, exécute les commandes d'instance existantes, lance le serveur compilé puis vérifie healthz et le contrat réel du endpoint client-config. Il arrête le processus ensuite ; aucun compte métier, workspace de production ni e-mail envoyé. Ce contrôle doit passer avant d'être présenté comme preuve de démarrage.

Validation préalable du helper : node --check réussi ; invocation locale effectivement refusée avant toute action de base/service ; git diff --check et Gitleaks staged réussis. CI runtime en cours : https://github.com/claude972/test-Crm/actions/runs/40979175124. La CI verte précédente ne contenait pas ce contrôle et ne prouve donc pas son résultat.

## Démarrage vérifié et préparation navigateur

Le premier contrôle runtime (40979175124) a révélé P0-RUNTIME-001 : .swcrc émettait des chemins vers la mauvaise racine de sources. Correction backend ed80da151 (.swcrc baseUrl .), intégrée dans e7d1332ba. CI https://github.com/claude972/test-Crm/actions/runs/40979688501 **réussie, six jobs**, étape runtime effectivement exécutée. Base CI jetable initialisée, commandes d'instance réussies, serveur healthy et champ client-config réel vérifiés. Le code backend est identique à celui de PR #7 ; aucun original/base persistante utilisé.

Le helper navigateur et les entrées optionnelles du workflow backend sont maintenant préparés : un futur bundle issu du workflow frontend réutilisable sera téléchargé dans le runner, servi avec l'API réelle jetable, puis contrôlé sur desktop/mobile (accueil, passage au champ e-mail, assets, débordement horizontal). Les captures seront des artefacts CI. Aucun compte ni authentification simulée. Le slot de configuration du seul index.html compilé sera temporairement renseigné pour l'API loopback puis restauré ; les sources frontend ne sont pas éditées.

À ce checkpoint, browser-smoke reste désactivé dans l'orchestrateur tant que le bundle de Claude n'est pas livré : **aucun succès navigateur ou preview n'est revendiqué**. Pré-vérifications des helpers : syntaxe Node, refus effectif hors CI, diff propre et Gitleaks staged sans détection.

## Checkpoint frontend intégré

Checkpoint Claude désigné et relu : dd07d39d0e135b8844ebb1f1cb6fbe08edbde678 (PR #9). Même code applicatif/contrôleur/workflow que 4fe7f40c5 ; seuls les rapports sont ajoutés ensuite. Revue statique et comparaison indépendante des 225 sources avec les originaux : aucune divergence, contrats/icônes/basenames et protocoles du bridge préservés. Rapport partagé publié avant intégration ; source gate initial vert, build encore en attente.

L'orchestrateur appelle maintenant le workflow frontend de Claude, attend son artefact nommé, puis transmet cet artefact au contrôle backend avec browser-smoke activé. Une construction manquante empêche les tests navigateur de démarrer et ne peut pas produire un succès de l'ensemble. Les contrôles de sources/backend initiaux restent disponibles en parallèle.

P0-FRONT-BUILD-001 suit l'échec initial réel (UI dist/theme.cjs absent) et sa correction de chaîne de dépendances. Cette correction doit encore être vérifiée par la CI combinée ; aucune preview ou réussite navigateur n'est revendiquée à ce commit. Le frontend Char et les revues backend restantes sont des travaux distincts encore ouverts.

## Isolation des groupes de CI

Dans un workflow réutilisé, github.workflow désigne le workflow appelant. Les contrôles de sources et frontend avaient donc la même expression de groupe lors de l'appel combiné. Le groupe du contrôleur de sources est rendu explicitement unique (p0-integrity-<branche>), distinct du frontend, du backend et de l'orchestrateur. Référence primaire : https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations. Cette correction de configuration ne modifie aucune source applicative et doit être vérifiée dans le prochain run complet.
