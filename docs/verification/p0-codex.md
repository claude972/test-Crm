# P0 Codex — reprise backend et système

Date : 29 octobre 2026. Branche : `chore/p0-stabilization` ; base historique : `05972c1de4861566f8bbd0ed71dcf6dffd4cbdb6`.

## Commits d'implémentation

| Commit | Périmètre |
| --- | --- |
| adc6c4d30a2a6bd463a37a6462ad2a76b9bc7362 | Consignes racine, état P0 et mission Claude |
| ff366e7ea63caab23c1ad4b098525b43e62432fc | Réparations Forms, bootstraps et vérification de compatibilité |
| db4d81302a488dd5d63bb85986b35c814837c857 | Clé de fixture générée aléatoirement |
| 2bd457eccbb3fbde1a48358be98ce768b0bd5470 | Identifiants backend Char et vérification Ruby |
| 4e38a6de56c5ba00795aa6dace70278aebbbc14c | Identifiants/chemins backend CRM et vérification des imports |
| f5ed0f2d16c680cfde85e4123299790d64a9d900 | Workspaces, lockfile et sources de la bibliothèque UI manquante |
| 620bad70b2be0ea93693beb16a1b5bf2f537cb6d | Scripts locaux, Compose et contrôles de conservation/limites de migration |
| 4d1d26515241bfcbf3e3201c8a541040b0a024d9 | Annulation des exécutions CI remplacées |
| 674d5b6db78d66dbb6e86540e7b94bd568ce7940 | Vérification des artefacts après build shared |
| bb11083776b05f4998d6ddc1a5f15e2deb16539e | Refus des commandes de runtime partagé depuis un worktree lié |
| 3adbd349dae9b91719c82426f55b447f17deed1f | Construction via API Vite explicitement attendue |
| 8b92d764613e12839a35c3205f41da6bf8c52b3d | Phase tsgo/tsc-alias de déclarations ajoutée à la CI |
| 89ab4e8b17c039fec3e2ea29d2e90fac436c156b | Contrôles applicatifs évitant les relances pour changements documentaires seuls |

## Conservation des originaux

Le checkout initial `fix/crm-workspace-paths` et le worktree `fix/char-identifiers` sont conservés. Aucun reset, clean, stash, changement de branche d'un autre agent ou migration n'a été exécuté.

Sauvegarde privée hors dépôt : 55 696 fichiers avec SHA-256, archive relue entrée par entrée, une suppression préexistante consignée, patches d'index/travail et historique complet vérifié par `git bundle verify`. Les fichiers ignorés et les bases ne sont pas copiés dans cette sauvegarde de sources et restent à leur emplacement initial.

Avant les réparations sur le worktree isolé : toutes les empreintes des originaux, le statut, l'index et le patch binaire étaient identiques à la sauvegarde. Une nouvelle comparaison après interruption confirme encore 55 696 fichiers inchangés, aucun différent ni manquant. Les originaux ne sont pas remplacés par les versions réparées publiées.

## Vérifications effectuées

- Gitleaks sur chaque lot préparé : aucune détection non résolue dans les changements publiés. La clé de fixture factice initiale a été remplacée par une clé aléatoire pour éliminer un faux positif ; aucun secret d'accès réel n'était concerné. Le contrôle ne constitue pas un audit de l'ensemble de l'historique préexistant.
- Diff d'espacement et liens relatifs des documents contrôlés avant publication.
- Forms : 839 sources TS analysées ; les deux scripts d'initialisation HTML exécutés dans un navigateur simulé minimal via VM ; déchiffrement d'une enveloppe historique, rejets de mauvaise clé et d'altération. [Exécution en ligne](https://github.com/claude972/test-Crm/actions/runs/40962114370), commit 2bd457ecc.
- Char : compilation sans exécution de 3 369 fichiers Ruby/Rake/Jbuilder, avec Ruby 3.4.4 en CI. [Même exécution en ligne](https://github.com/claude972/test-Crm/actions/runs/40962114370). Aucun chargement Rails ou accès base.
- CRM : 13 954 fichiers backend/shared TS analysés et 50 293 imports internes résolus ; compatibilité du marqueur de réponse entre shared et SDK exécutée. [Exécution en ligne](https://github.com/claude972/test-Crm/actions/runs/40962647364), commit 4e38a6de5.
- Workspaces : 18 dossiers déclarés présents, noms uniques et 23 références `workspace:` résolues. Installation Yarn 4 `--immutable` réussie dans [la CI f5ed0f2d1](https://github.com/claude972/test-Crm/actions/runs/40962856348). Avertissements de peer dependencies et scripts désactivés conservés comme limites ; ne pas assimiler cette installation à une construction intégrée.
- Build shared : la première commande retournait zéro sans preuve d'artefacts suffisante. Le contrôle strict a ensuite échoué. Le target existant prévoit Vite puis une génération de déclarations via tsgo et tsc-alias ; cette seconde phase était omise par la CI ajoutée pendant P0. La CI attend désormais l'API Vite, exécute aussi la phase déclarations et exige les sorties non vides. Le résultat complet reste à vérifier.
- Exploitation : syntaxe des scripts mjs ; test de setup répété avec comparaison des fichiers et permissions 0600 ; trois URL de migration non autorisées refusées avant Docker ; commandes inconnues et sources de module absentes refusées. Tests exécutés dans un répertoire temporaire isolé, nettoyé ensuite. Compose CRM et modules validés avec `config --quiet`, sans lancement de service. Les commandes de contrôle du runtime partagé et les sauvegardes sont refusées depuis un worktree lié ; ce refus est testé.

## Changements volontairement écartés

- Forms : changement de `SECRET_KEY_INFO` non repris. Avec la même clé et la même enveloppe, le code publié déchiffre l'ancien format et le code local renommé le refuse ; incompatibilité confirmée.
- Char : renommage du cookie de session non repris afin de conserver les sessions existantes.
- CRM : ancienne valeur `__kovaa-labHttpResponse` conservée ; les propriétés sont citées correctement au lieu de modifier le protocole.
- Catalogues de traduction régénérés non repris. `build-crm.mjs` n'extrait plus automatiquement les traductions.
- Import Cal.diy non publié : scan initial de 84,5 Mo, 206 détections à qualifier, dont 164 dans i18n.lock et d'autres dans exemples, fixtures ou documentation. Le rapport expurgé reste privé ; aucune conclusion de fuite réelle n'est tirée de ces détections seules.

## Coordination et revue

La mission complète est publiée dans [l'issue #5](https://github.com/claude972/test-Crm/issues/5) et docs/handoff/claude-frontend-p0.md. La session Claude initiale (base 2bd457ecc, actualisée ensuite à bb1108377) a été interrompue. Une autre session déjà active sur la mission #5 a été détectée à la reprise ; la relance a été arrêtée pour éviter un doublon. Le suivi courant est publié dans les fichiers racine MISSIONS.md et CORRECTIONS.md de missions/p0-stabilization. Aucun résultat Claude n'est déclaré tant que son rapport et son SHA ne sont pas disponibles.

La PR Codex est [#4](https://github.com/claude972/test-Crm/pull/4), brouillon vers fix/crm-workspace-paths. Aucun merge sur main effectué.

## Limites

P0 reste ouvert pour les réparations frontend, l'import Cal.diy, les constructions/types intégrés, la revue croisée et la preview. Aucun test métier global, E2E, restauration complète d'application, déploiement ou démarrage des volumes existants effectué. Les contrôles de syntaxe ne remplacent pas un typecheck. Le guide infra marque ses anciens résultats locaux comme historiques. Les profils VM/Compose historiques ne sont pas encore isolés pour un démarrage simultané de plusieurs worktrees ; les scripts refusent ces commandes dans les worktrees liés.
