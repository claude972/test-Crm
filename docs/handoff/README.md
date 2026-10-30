# Missions partagées sur GitHub

À chaque nouvelle mission, lire AGENTS.md, DESIGN.md, ce document, la mission attribuée et les rapports de vérification. Claude lit aussi CLAUDE.md.

## Coordination courante

La source partagée courante est `missions/p0-stabilization`, fichiers racine `MISSIONS.md` et `CORRECTIONS.md`. Avant de commencer : récupérer cette branche, lire ces deux fichiers depuis le remote et vérifier qu'aucun agent n'a déjà pris la même mission. Les documents de ce dossier restent les consignes détaillées et l'historique ; les statuts et rapports partagés sont tenus sur la branche de coordination.

- https://github.com/claude972/test-Crm/blob/missions/p0-stabilization/MISSIONS.md
- https://github.com/claude972/test-Crm/blob/missions/p0-stabilization/CORRECTIONS.md

Le remote historique ne récupère automatiquement que main. Pour créer explicitement la référence de coordination sans changer cette configuration :

```sh
git fetch origin refs/heads/missions/p0-stabilization:refs/remotes/origin/missions/p0-stabilization
git show origin/missions/p0-stabilization:MISSIONS.md
git show origin/missions/p0-stabilization:CORRECTIONS.md
```

## Missions P0 courantes

Les statuts effectifs se lisent dans les deux fichiers racine de `missions/p0-stabilization`, après fetch explicite. Ne pas attendre une réponse ancienne d'issue si CORRECTIONS.md contient déjà la décision.

- Inventaire Claude : PR #6, branche `chore/claude-frontend-inventory` ; dernière révision connue au relais `71350185373ed7b8a57a15fc579a870a3fc19b6d`. Les précisions P0-DOC-001/002/003 et le rapport partagé doivent être livrés avant sa prise de mission suivante.
- Réparation frontend Claude : mission `p0-frontend-baseline`, branche `fix/claude-frontend-baseline`, base commune `c0318cf0b33134c4c292affe395009a6bd3b4662`. Reprise P0 de syntaxe/imports, sans refonte ni Outils clients.
- Checkpoint backend Codex : PR #7, branche `fix/codex-backend-build` ; code `79305ae2e63e72456e3c5b78ae5ced483d951557`, tête documentaire `c13d12652959bb2903987c539359d9cbfe5f86fc`. CI backend verte, revue Claude encore requise.
- Vérification combinée Codex : PR #8, branche `chore/p0-combined-verification`. Intégration isolée et contrôles en ligne ; aucune validation globale déduite de la seule CI backend.

La publication GitHub ne démarre pas un agent. Une session réelle a été chargée de l'exécution frontend après le relais de l'inventaire ; vérifier son activité et les prises de mission avant toute relance. Ne pas lancer une deuxième implémentation.

La base historique `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6` et les consignes d'inventaire restent un historique. Les branches P1 `feat/claude-client-tools-ui` et `feat/codex-client-tools-api` ne sont pas une tâche à démarrer pendant P0. Le contrat P1 et l'achat du domaine ne bloquent pas la réparation de la syntaxe.

## Transmission et revue

Créer chaque branche dans un worktree distinct. Avant intervention, consigner branche, commit de base, périmètre et fichiers possédés. Ne pas changer le checkout d'un autre agent.

Chaque livraison conserve son rapport historique `docs/verification/<mission>-<agent>.md` et publie son rapport partagé dans `CORRECTIONS.md` sur la branche de coordination, avec commit d'implémentation, changements, commandes réellement exécutées, résultats, preview, limites et points de revue. L'autre agent examine ce commit précis ; les corrections utilisent des commits ciblés, sans réécriture d'historique. Les corrections sur une branche distincte restent à intégrer.

Les contrats partagés sont proposés par Codex et validés avec Claude avant changement des types ou du schéma. Une URL configurée ne prouve ni la disponibilité d'un outil ni l'autorisation de son utilisateur.
