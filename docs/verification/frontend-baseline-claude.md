# Réparation de la base frontend P0 — Claude

Mission `p0-frontend-baseline`. Date : 29 octobre 2026. Agent : Claude (frontend et design).

## 1. Révisions

| Élément | Valeur |
| --- | --- |
| Base de départ résolue | **`c0318cf0b33134c4c292affe395009a6bd3b4662`** |
| Branche | `fix/claude-frontend-baseline`, worktree distinct |
| PR brouillon | https://github.com/claude972/test-Crm/pull/9 → `chore/p0-stabilization` |
| Lot 1 — `twenty-front` | `7a9431428e625de81cf95da8892631ca3e285f0e` |
| Lot 2 — renderer | `90d5bc1634ac2ee2818ae81c3b6aeaccf187a0c4` |
| Lot 3 — contrôleur et workflow | `2671be330d7cf496671386f82014c4e8a4cf4f29`, puis `4fe7f40c5b77d5197e2108d4022fd77f473fb24b` |
| Affectation réclamée dans `MISSIONS.md` | `eef205c2b1c87388cdb70e11d91b88ef3206cc94` |

Checkout `test-Crm` en lecture seule, HEAD `05972c1de` inchangé, 2 965 fichiers modifiés préservés. Aucun `reset`, `clean` ni `stash`. Aucun fichier `.env` ou `.runtime` lu.

## 2. Résultat mesuré

`scripts/check-frontend-p0.cjs`, sur `twenty-front` et `twenty-front-component-renderer` :

| Mesure | Avant | Après |
| --- | --- | --- |
| Échecs totaux | **1 336** | **0** |
| Fichiers affectés | 226 | 0 |
| Diagnostics de parsing | 741 | 0 |
| Imports internes non résolus | 383 | 0 |
| Fichiers avec marque espacée dans un identifiant | 212 | 0 |

Après réparation : 13 015 sources analysées, 47 222 imports internes résolus, 65 imports d'assets vérifiés sur disque, **code de sortie 0**.

### Élargissement par rapport à l'inventaire

Mon inventaire (PR #6) n'avait mesuré que `twenty-front` — 223 diagnostics, 27 imports. `twenty-front-component-renderer`, pourtant dans mon périmètre de propriété, **n'avait pas été mesuré** et portait à lui seul environ 518 diagnostics et 356 imports non résolus. C'est un manque de mon inventaire, et je le consigne comme tel.

## 3. Nature de la réparation

Cause unique : un remplacement global a injecté la chaîne d'affichage de la marque, **avec une espace**, à l'intérieur d'identifiants et de chaînes de chemin de module. La réparation est un ensemble de règles **scopées**, jamais un remplacement global — c'en est précisément la cause.

La cible dépend de **qui définit le nom** :

| Définisseur | Cible | Exemple |
| --- | --- | --- |
| Contrat serveur | le contrat | `allowRequestsToKovaaLabCRMIcons` |
| Paquet fournisseur | l'export réel | `IconTwentyStar`, `IconTwentyStarFilled` |
| Entrée sur disque | le basename réel | `allowRequestsToTwentyIcons.ts`, `twenty-ui-gallery/` |
| Frontend seul | jeton sûr sans espace | `KovaaLabCRMIconsState` |

### Lot 1 — `twenty-front`, 53 fichiers

Chemins de modules restaurés vers les cinq basenames réels, scopés par un `/` précédent pour ne pas toucher les formes symbole et propriété. Icônes ramenées à ce que `kovaa-lab-ui` exporte (`src/icon/index.ts:32-33`). Dé-espacement en `KovaaLabCRM` sur adjacence d'identifiant uniquement. Clé d'objet à tiret quotée dans `mcpSetup.test.ts:45`.

### Lot 2 — `twenty-front-component-renderer`, 172 fichiers

Trois formes supplémentaires : répertoires et fichiers rebrandés *dans les chemins* (`twenty-ui-gallery`, `TwentyUiGalleryStory`, `TwentyUiGalleryPlayFunction`, les utilitaires et la constante `TwentyUi` du cascade layer) — seul le segment de chemin change, les symboles exportés gardant leur graphie `KovaaLabCRM` ; tirets injectés dans des identifiants, dé-hyphénation **limitée aux deux fichiers que le parser désignait** ; et `'../../../kovaa-lab-sdk/dist/…'` restauré en `twenty-sdk`, qui existe sur disque là où `kovaa-lab-sdk` n'existe pas.

## 4. Ce que je n'ai délibérément pas changé

**`src/constants/ScrollBridgeProperties.ts`.** Il porte `'__kovaa-labScrollRequest'` et `'__kovaa-labScrollUpdate'`. Les originaux écrivent `__kovaaLab*`. Mais la forme publiée est une **chaîne de caractères**, donc syntaxiquement valide, et ce sont des **valeurs de protocole de bridge**. Les aligner ne corrigerait aucune erreur de syntaxe et modifierait un protocole, ce que la mission interdit. Laissé tel quel, et consigné ici comme divergence connue entre la branche publiée et les originaux, à arbitrer hors P0.

C'est la même distinction que pour `__kovaa-labHttpResponse` : une valeur de protocole se **cite**, elle ne se renomme pas.

**Les noms de paquets npm.** `kovaa-lab-ui`, `kovaa-lab-shared` et les clés d'alias correspondantes (`'kovaa-lab-ui/style.css'`, `` `kovaa-lab-shared/${submodule}` ``) sont les **vrais noms de paquets**, confirmés dans les manifestes. Seuls les basenames de répertoires sont `twenty-*`.

## 5. Une régression que j'ai introduite puis corrigée

J'avais appliqué la règle de chemin `kovaa-lab-ui-gallery` → `twenty-ui-gallery` de façon trop large. Or cette chaîne est **aussi un identifiant de story Storybook**, utilisé dans des URL `/iframe.html?id=frontcomponent-kovaa-lab-ui-gallery--…` par les tests natifs, et dans le titre de la galerie. Les originaux la conservent. Ma règle aurait fait demander aux tests natifs des URL inexistantes.

Détectée par le diff de convergence contre les originaux, pas par le contrôleur — le contrôleur ne voit ni les identifiants de story ni les URL. Reverté dans le lot 2 ; 6 occurrences dans 4 fichiers.

C'est la limite exacte de mon contrôleur : il valide la syntaxe et la résolution des modules, **pas la justesse sémantique d'une chaîne**.

## 6. Convergence avec les originaux

Les **225 fichiers** réparés sont **octet pour octet identiques aux originaux locaux correspondants** — 53 sur 53 au lot 1, 172 sur 172 au lot 2, zéro divergence.

Cette convergence a été **atteinte par les règles ci-dessus, pas par copie**. C'est la preuve la plus forte dont je dispose que la réparation est comprise et non devinée, et elle démontre aussi que rien d'autre n'a été repris des originaux : aucun catalogue, aucun outil intégré, aucune fonctionnalité non publiée.

## 7. Contrôleur et CI

`scripts/check-frontend-p0.cjs` et `.github/workflows/p0-frontend-baseline.yml`, pris en propriété au titre de l'extension accordée et **enregistrés dans `MISSIONS.md` avant édition**. `scripts/check-crm-p0.cjs` et les workflows backend de Codex ne sont pas modifiés, de sorte qu'un échec frontend ne peut pas rendre rouge le checkpoint backend.

Deux contrôles que le contrôleur backend n'a pas de raison de porter :

- **Assets résolus sur le système de fichiers** plutôt que par `ts.resolveModuleName`, qui ne voit pas les loaders Vite. Sans cela, 65 imports sains seraient signalés en échec et le job serait désactivé à juste titre. Une requête Vite peut porter plusieurs drapeaux (`?worker&inline`) : toute la requête est retirée. Ce point a été corrigé après qu'un faux positif me l'a révélé.
- **Marque espacée dans un identifiant signalée explicitement**, avec le remède nommé — une erreur de parsing ne dit pas ce qui a mal tourné.

Le workflow expose `workflow_call` et le nom de l'artefact en sortie, pour que la vérification combinée de Codex l'appelle au lieu de le dupliquer.

Deux corrections apportées au workflow après revue de Codex, toutes deux justifiées :

1. Il ne construisait que `kovaa-lab-shared`. Le front dépend aussi de `kovaa-lab-ui` et `kovaa-lab-front-component-renderer`, et **les trois** résolvent par `exports` vers `dist` — vérifié dans leurs manifestes. Les trois sont désormais construits, chacun avec une assertion d'émission.
2. Le CLI Vite a déjà été observé dans ce dépôt sortant en 0 **sans rien émettre** (P0-BUILD-001). Le build du front passe donc par l'**API JS**, dont la promesse rejette en cas d'échec.

Les assertions d'artefacts sont **conservées et resserrées**, pas relâchées : `index.html` non vide portant l'élément racine, et au moins un chunk émis de plus de 1 ko. Les deux ont été vérifiées contre les sources avant d'être affirmées (`vite.config.ts:224` fixe `outDir: 'build'`, `index.html:89` porte le `div#root`).

## 8. Contrôles exécutés, et contrôles non exécutés

**Exécutés :** `scripts/check-frontend-p0.cjs` avant et après, sur les deux paquets, avec ventilation par paquet et par catégorie ; `node --check` sur le contrôleur ; diff de convergence des 225 fichiers contre les originaux ; vérification du contrat serveur à `client-config.entity.ts:423` et `services/client-config.service.ts:297` ; vérification de l'existence sur disque de chaque basename restauré ; `git diff --cached --check` sur chaque lot.

**Non exécutés — et aucun critère correspondant n'est validé :**

- **Aucun build, aucun typecheck, aucun test.** L'installation du workspace a été tentée ; son résultat réel est consigné au § 9. Le parsing et la résolution d'imports **ne prouvent ni les types, ni le build, ni le comportement**.
- **Le job `frontend-bundle` n'est pas vérifié par moi.** Sa première exécution CI le prouvera ou l'infirmera.
- **Aucun rendu, aucune preview, aucune capture.** Aucun test clavier, lecteur d'écran, responsive ou E2E.
- Aucun déploiement, aucun contact avec la production.
- Cal.diy et « Outils clients » restent hors P0, non intégrés.

## 9. Installation du workspace : tentée, échouée

**Résultat réel, sans arrondi favorable : l'installation n'a pas abouti, donc aucun build ni typecheck frontend n'a pu être exécuté localement.**

`node .yarn/releases/yarn-4.18.1.cjs install --immutable` dans `apps/crm/ui` :

- la résolution et la récupération aboutissent — 946 Mo écrits dans `node_modules` ;
- l'exécution se termine ensuite sur `ERROR: Yarn is terminating due to an unexpected empty event loop. Please report this issue at https://github.com/yarnpkg/berry/issues.` ;
- l'étape de liaison n'a pas été franchie : `node_modules/.bin` contient **0 binaire**, `node_modules/vite` et `node_modules/.bin/tsgo` sont **absents**.

Sans `tsgo` ni `vite`, ni `tsgo -p tsconfig.json --noEmit` ni un build Vite ne peuvent être lancés ici. Je ne revendique donc **aucun** typecheck et **aucun** build frontend.

Un détail mérite d'être relevé, parce qu'il est de la même famille que les deux pièges déjà rencontrés dans cette mission : **le code de sortie observé par mon harnais était 0** alors que yarn imprimait une erreur et laissait l'installation inutilisable. Le code de sortie n'est pas une preuve — c'est précisément pourquoi le workflow passe par l'API JS de Vite plutôt que par son CLI, et pourquoi il assortit chaque build d'une assertion sur les artefacts émis.

### Résultat CI, exécuté

| Job | Résultat |
| --- | --- |
| `frontend-sources` | **réussi en 26 s** — https://github.com/claude972/test-Crm/actions/runs/40981738957 |
| `frontend-bundle` | **échoué en 5 min 16** |

Le job de garde est donc **vérifié en environnement propre**, et pas seulement par ma mesure locale.

L'échec du bundle est **attendu et laissé tel quel**, cause identifiée dans le log : Nx construit `kovaa-lab-shared` ✅, `kovaa-lab-shared:build:individual` ✅, `kovaa-lab-ui` ✅, `kovaa-lab-ui:build:individual` ✅, puis `kovaa-lab-front-component-renderer:build` échoue sur **`kovaa-lab-client-sdk:build`**. Ce paquet appartient au backend et porte encore, sur la base `c0318cf0b`, les défauts réparés dans `ed80da151`.

Je **ne recrée pas** ces réparations et je **ne masque pas** l'erreur, conformément à la consigne de Codex. Ce n'est pas un défaut frontend : c'est une **dépendance inter-branches**, et la construction combinée de PR #8, qui contient déjà le correctif backend, est le bon endroit pour en obtenir la preuve. Le job reste rouge et documenté plutôt que contourné.

La preuve de construction du bundle est donc déléguée à la vérification combinée, dans un environnement propre où `yarn install --immutable` est déjà démontré fonctionnel par le job `crm-workspace` de Codex. Le job `frontend-bundle` de mon workflow est conçu pour cela, et **sa première exécution le prouvera ou l'infirmera**.

Avertissement de Codex pris en compte : si cette construction échoue par les défauts `client-sdk` / `emails` encore présents sur la base `c0318cf0b`, je ne recréerai pas ses réparations et ne masquerai pas l'erreur — elles existent dans `ed80da151` et dans la construction combinée de PR #8, où le résultat combiné pourra être vérifié sans forcer une indépendance artificielle des branches.

## 10. Revue du lot backend de Codex

Consignée dans `CORRECTIONS.md`, section `p0-frontend-baseline — revue Claude du lot backend`, sur le SHA `ed80da15116fd2d1490022cf53564d85bc0abe26`.

## 11. Revue croisée

**Demandée à Codex sur `4fe7f40c5b77d5197e2108d4022fd77f473fb24b`. Je ne la déclare pas terminée.** Mon statut ne passera à `ready_for_review` qu'après publication du rapport partagé dans `CORRECTIONS.md`.
