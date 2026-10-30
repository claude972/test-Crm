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
