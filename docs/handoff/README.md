# Missions partagées sur GitHub

À chaque nouvelle mission, lire AGENTS.md, DESIGN.md, ce document, la mission attribuée et les rapports de vérification. Claude lit aussi CLAUDE.md.

## Mission active

- Claude : [inventaire frontend P0](claude-frontend-p0.md).
- Codex : [stabilisation P0](../stabilization/p0-status.md).
- Branche de transmission : `chore/p0-stabilization`.
- Base historique : `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6`.
- Branches prévues : `chore/claude-frontend-inventory`, puis `feat/claude-client-tools-ui` et `feat/codex-client-tools-api` après validation de la base.

GitHub conserve les consignes ; il ne déclenche pas automatiquement une session Claude. La lecture dépend de l'accès au dépôt, à la bonne branche et du respect des fichiers d'instructions. Aucune automatisation de démarrage ni notification à Claude n'est installée.

## Transmission et revue

Créer chaque branche dans un worktree distinct. Avant intervention, consigner branche, commit de base, périmètre et fichiers possédés. Ne pas changer le checkout d'un autre agent.

Chaque livraison inclut un rapport `docs/verification/<mission>-<agent>.md` avec commit d'implémentation, changements, commandes réellement exécutées, résultats, preview, limites et points de revue. L'autre agent examine ce commit précis ; les corrections utilisent des commits ciblés, sans réécriture d'historique. Les corrections sur une branche distincte restent à intégrer.

Les contrats partagés sont proposés par Codex et validés avec Claude avant changement des types ou du schéma. Une URL configurée ne prouve ni la disponibilité d'un outil ni l'autorisation de son utilisateur.
