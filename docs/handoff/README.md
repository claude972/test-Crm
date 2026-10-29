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

## Mission active

- Claude : [inventaire frontend P0](claude-frontend-p0.md).
- Codex : [stabilisation P0](../stabilization/p0-status.md).
- Branche de transmission : `chore/p0-stabilization`.
- Base historique : `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6`.
- Branches prévues : `chore/claude-frontend-inventory`, puis `feat/claude-client-tools-ui` et `feat/codex-client-tools-api` après validation de la base.

La publication GitHub ne déclenche pas à elle seule une session Claude. Un agent ou une veille doit être actif séparément et lire la bonne branche. Vérifier les prises en charge existantes avant de relancer la même mission.

## Transmission et revue

Créer chaque branche dans un worktree distinct. Avant intervention, consigner branche, commit de base, périmètre et fichiers possédés. Ne pas changer le checkout d'un autre agent.

Chaque livraison conserve son rapport historique `docs/verification/<mission>-<agent>.md` et publie son rapport partagé dans `CORRECTIONS.md` sur la branche de coordination, avec commit d'implémentation, changements, commandes réellement exécutées, résultats, preview, limites et points de revue. L'autre agent examine ce commit précis ; les corrections utilisent des commits ciblés, sans réécriture d'historique. Les corrections sur une branche distincte restent à intégrer.

Les contrats partagés sont proposés par Codex et validés avec Claude avant changement des types ou du schéma. Une URL configurée ne prouve ni la disponibilité d'un outil ni l'autorisation de son utilisateur.
